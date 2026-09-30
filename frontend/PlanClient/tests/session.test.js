import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore } from '../src/lib/session.js';
import { createApiClient } from '../src/lib/httpClient.js';

const identity = { access: 'old', refresh: 'refresh', id: 1, role: 'seller', name: 'Designer' };
const response = (status, data = {}) => new Response(JSON.stringify(data), { status });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
function setup(fetcher) {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const session = createSessionStore(storage);
  session.login(identity, session.getSnapshot());
  return { session, storage, api: createApiClient('/api', session, fetcher) };
}

test('concurrent 401s share refresh; delayed old 401 reuses the new token', async () => {
  const gate = deferred();
  let refreshes = 0;
  let retries = 0;
  const { api, session } = setup(async (url, options) => {
    if (url.endsWith('/token/refresh/')) {
      refreshes++;
      assert.equal(new Headers(options.headers).has('Authorization'), false);
      assert.deepEqual(JSON.parse(options.body), { refresh: 'refresh' });
      await gate.promise;
      return response(200, { access: 'new' });
    }
    const token = options.headers.get('Authorization');
    if (token === 'Bearer old') return response(401);
    assert.equal(token, 'Bearer new');
    retries++;
    return response(200, { ok: true });
  });
  const first = api('/seller/');
  const second = api('/catalogue/mine/');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(refreshes, 1);
  gate.resolve();
  assert.deepEqual(await Promise.all([first, second]), [{ ok: true }, { ok: true }]);
  assert.equal(retries, 2);
  assert.equal(session.getSnapshot().access, 'new');
});

test('a delayed initial 401 does not start a second refresh', async () => {
  const delayed = deferred();
  let refreshes = 0;
  const { api } = setup(async (url, options) => {
    if (url.endsWith('/token/refresh/')) { refreshes++; return response(200, { access: 'new' }); }
    if (options.headers.get('Authorization') === 'Bearer new') return response(200);
    if (url.endsWith('/slow/')) return delayed.promise;
    return response(401);
  });
  const slow = api('/slow/');
  await api('/fast/');
  delayed.resolve(response(401));
  await slow;
  assert.equal(refreshes, 1);
});

test('rejected refresh clears the session; second request 401 cannot loop', async () => {
  for (const refreshStatus of [401, 403, 200]) {
    let calls = 0;
    const { api, session } = setup(async url => {
      calls++;
      return url.endsWith('/token/refresh/') ? response(refreshStatus, { access: 'new' }) : response(401);
    });
    await assert.rejects(api('/seller/'), /expired/);
    assert.equal(calls, refreshStatus === 200 ? 3 : 2);
    assert.equal(session.getSnapshot().user, null);
    assert.equal(session.getSnapshot().reason, 'expired');
  }
});

test('403 and guest 401 never refresh or clear the designer session', async () => {
  for (const options of [{}, { authenticate: false, headers: { 'X-Checkout-Session': 'guest' } }]) {
    let calls = 0;
    const { api, session } = setup(async (url, request) => {
      calls++;
      if (options.authenticate === false) {
        assert.equal(request.headers.has('Authorization'), false);
        assert.equal(request.headers.get('X-Checkout-Session'), 'guest');
      }
      return response(options.authenticate === false ? 401 : 403);
    });
    await assert.rejects(api('/resource/', options));
    assert.equal(calls, 1);
    assert.equal(session.getSnapshot().user.id, 1);
  }
});

test('network, server and malformed refresh responses preserve the session', async () => {
  for (const failure of ['network', 500, 'malformed']) {
    const { api, session } = setup(async url => {
      if (!url.endsWith('/token/refresh/')) return response(401);
      if (failure === 'network') throw new TypeError('offline');
      return response(failure === 500 ? 500 : 200);
    });
    await assert.rejects(api('/seller/'));
    assert.equal(session.getSnapshot().access, 'old');
    assert.equal(session.getSnapshot().user.id, 1);
  }
});

test('logout or account replacement during refresh cannot restore old credentials', async () => {
  for (const replacement of [false, true]) {
    const gate = deferred();
    const started = deferred();
    const { api, session } = setup(async url => {
      if (!url.endsWith('/token/refresh/')) return response(401);
      started.resolve();
      return gate.promise;
    });
    const request = api('/seller/');
    await started.promise;
    session.clear();
    if (replacement) session.login({ ...identity, id: 2, access: 'other', refresh: 'other-refresh' }, session.getSnapshot());
    gate.resolve(response(200, { access: 'late' }));
    await assert.rejects(request, /session changed/);
    assert.equal(session.getSnapshot().access, replacement ? 'other' : null);
  }
});

test('aborting one caller does not abort another caller shared refresh', async () => {
  const gate = deferred();
  let retries = 0;
  const { api } = setup(async (url, options) => {
    if (url.endsWith('/token/refresh/')) { await gate.promise; return response(200, { access: 'new' }); }
    if (options.headers.get('Authorization') === 'Bearer old') return response(401);
    retries++;
    return response(200);
  });
  const controller = new AbortController();
  const cancelled = api('/seller/', { signal: controller.signal });
  const active = api('/catalogue/mine/');
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  gate.resolve();
  await assert.rejects(cancelled, { name: 'AbortError' });
  await active;
  assert.equal(retries, 1);
});

test('reload, external logout, subscriptions and stale login protection', () => {
  const { storage, session } = setup();
  assert.equal(createSessionStore(storage).getSnapshot().user.id, 1);
  let notifications = 0;
  const unsubscribe = session.subscribe(() => notifications++);
  const pendingLogin = session.getSnapshot();
  storage.removeItem('refreshToken');
  session.sync();
  assert.equal(session.getSnapshot().user, null);
  assert.equal(notifications, 1);
  assert.throws(() => session.login(identity, pendingLogin), /session changed/);
  unsubscribe();
  storage.setItem('user', '{invalid');
  assert.equal(createSessionStore(storage).getSnapshot().user, null);
});

test('failed storage removal does not restore an in-memory logged-out session', () => {
  const { storage, session } = setup();
  storage.removeItem = () => { throw new Error('blocked'); };
  session.clear();
  session.sync();
  assert.equal(session.getSnapshot().user, null);
});

test('FormData and blob responses survive the single authorized retry', async () => {
  const body = new FormData();
  body.set('title', 'Plan');
  const { api } = setup(async (url, options) => {
    if (url.endsWith('/token/refresh/')) return response(200, { access: 'new' });
    assert.equal(options.body, body);
    assert.equal(options.headers.has('Content-Type'), false);
    return options.headers.get('Authorization') === 'Bearer old' ? response(401) : new Response('file');
  });
  const blob = await api('/upload/', { method: 'POST', body, responseType: 'blob' });
  assert.equal(await blob.text(), 'file');
});
