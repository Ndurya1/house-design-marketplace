import { formatApiError, connectionError } from './apiErrors.js';

export function createApiClient(baseUrl, session, fetcher = (...args) => fetch(...args)) {
  let refreshing = null;
  const changed = () => new Error('Your session changed. Please try again.');
  const expired = () => new Error('Your sign-in has expired. Please sign in again.');
  const send = async (endpoint, options) => {
    try { return await fetcher(`${baseUrl}${endpoint}`, options); }
    catch (error) {
      if (error.name === 'AbortError') throw error;
      throw connectionError();
    }
  };
  const fail = async response => {
    const data = await response.json().catch(() => null);
    throw new Error(formatApiError(data, response.status));
  };
  const refresh = expected => {
    if (refreshing?.epoch === expected.epoch) return refreshing.promise;
    const job = { epoch: expected.epoch };
    job.promise = (async () => {
      // Independent from a caller's abort signal: other requests may still need it.
      const response = await send('/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: expected.refresh }),
      });
      if (!session.current(expected)) throw changed();
      if (response.status === 401 || response.status === 403) {
        session.clear('expired');
        throw expired();
      }
      if (!response.ok) return fail(response);
      const data = await response.json().catch(() => null);
      if (typeof data?.access !== 'string' || !data.access) {
        throw new Error('The service returned an unreadable session response. Please try again.');
      }
      session.renew(data.access, expected);
    })().finally(() => { if (refreshing === job) refreshing = null; });
    refreshing = job;
    return job.promise;
  };

  return async (endpoint, options = {}) => {
    const { responseType, authenticate = true, ...fetchOptions } = options;
    session.sync();
    const expected = session.getSnapshot();
    const authenticated = authenticate && Boolean(expected.access);
    const headers = new Headers(options.headers);
    if (!authenticate) headers.delete('Authorization');
    if (authenticated) headers.set('Authorization', `Bearer ${expected.access}`);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const check = () => {
      options.signal?.throwIfAborted();
      if (authenticated && !session.current(expected)) throw changed();
    };
    let response = await send(endpoint, { ...fetchOptions, headers });
    check();
    if (response.status === 401 && authenticated && endpoint !== '/token/refresh/') {
      // Another request may already have refreshed the rejected access token.
      if (session.getSnapshot().access === expected.access) await refresh(expected);
      check();
      headers.set('Authorization', `Bearer ${session.getSnapshot().access}`);
      response = await send(endpoint, { ...fetchOptions, headers });
      check();
      if (response.status === 401) {
        session.clear('expired');
        throw expired();
      }
    }
    if (!response.ok) return fail(response);
    if (responseType === 'blob') {
      const blob = await response.blob();
      check();
      return blob;
    }
    const text = await response.text();
    check();
    try { return text ? JSON.parse(text) : {}; }
    catch { throw new Error('The service returned an unreadable response. Please refresh and try again.'); }
  };
}
