export const storageKey = (reference) => `checkout:${reference}`;
export const readSession = (reference) => {
  try { return JSON.parse(sessionStorage.getItem(storageKey(reference))) || {}; }
  catch { return {}; }
};
