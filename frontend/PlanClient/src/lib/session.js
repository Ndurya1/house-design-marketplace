// Proposed destination: src/lib/session.js
export function createSessionStore(storage) {
  const keys = ['accessToken', 'refreshToken', 'user'];
  const listeners = new Set();
  let epoch = 0;
  let storageFailed = false;
  let snapshot = { access: null, refresh: null, user: null, reason: null, epoch };
  const emit = () => listeners.forEach(listener => listener());
  const read = () => {
    if (storageFailed) return { access: null, refresh: null, user: null };
    try {
      const access = storage.getItem('accessToken');
      const refresh = storage.getItem('refreshToken');
      const user = JSON.parse(storage.getItem('user'));
      if (access && refresh && user?.id && typeof user.role === 'string') return { access, refresh, user };
    } catch { /* Invalid or unavailable storage is signed out. */ }
    return { access: null, refresh: null, user: null };
  };
  const sync = () => {
    const next = read();
    const sameUser = JSON.stringify(next.user) === JSON.stringify(snapshot.user);
    if (next.access === snapshot.access && next.refresh === snapshot.refresh && sameUser) return;
    if (next.refresh !== snapshot.refresh || !sameUser) epoch += 1;
    snapshot = { ...next, user: sameUser ? snapshot.user : next.user, reason: null, epoch };
    emit();
  };
  const clear = (reason = null) => {
    // Invalidate pending work even when browser storage is unavailable.
    epoch += 1;
    for (const key of keys) {
      try { storage.removeItem(key); } catch { storageFailed = true; }
    }
    snapshot = { access: null, refresh: null, user: null, reason, epoch };
    emit();
  };
  const current = expected => {
    sync();
    return snapshot.epoch === expected.epoch && snapshot.refresh === expected.refresh;
  };
  sync();
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    sync,
    clear,
    current,
    login(data, expected) {
      if (!current(expected)) throw new Error('Your session changed. Please sign in again.');
      if (typeof data.access !== 'string' || !data.access || typeof data.refresh !== 'string' || !data.refresh || !data.id || !data.role) {
        throw new Error('The sign-in response was incomplete. Please sign in again.');
      }
      const user = { id: data.id, name: data.name, email: data.email, role: data.role };
      try {
        storage.setItem('accessToken', data.access);
        storage.setItem('refreshToken', data.refresh);
        storage.setItem('user', JSON.stringify(user));
      } catch {
        clear();
        throw new Error('Your browser could not save the sign-in session. Check your browser storage settings and try again.');
      }
      epoch += 1;
      storageFailed = false;
      snapshot = { access: data.access, refresh: data.refresh, user, reason: null, epoch };
      emit();
      return user;
    },
    renew(access, expected) {
      if (!current(expected)) throw new Error('Your session changed. Please try again.');
      try { storage.setItem('accessToken', access); }
      catch {
        clear();
        throw new Error('Your browser could not save the session. Please sign in again.');
      }
      snapshot = { ...snapshot, access };
      emit();
    },
  };
}

// Access storage inside methods so disabled browser storage is handled above.
export const session = createSessionStore({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === null || ['accessToken', 'refreshToken', 'user'].includes(event.key)) session.sync();
  });
}
