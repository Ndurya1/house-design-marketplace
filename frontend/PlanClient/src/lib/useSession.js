import { useSyncExternalStore } from 'react';
import { session } from './session.js';

export function useSession() {
  return useSyncExternalStore(session.subscribe, session.getSnapshot);
}
