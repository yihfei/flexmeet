import { useSyncExternalStore } from 'react';

// True on touch screens (a finger is the main pointer), and kept up to date if that changes,
// e.g. a tablet getting a mouse.
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(pointer: coarse)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(pointer: coarse)').matches,
  );
}
