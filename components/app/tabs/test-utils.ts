/**
 * jsdom in this project ships without a localStorage implementation — polyfill
 * a minimal in-memory backing store so tests can exercise real code paths.
 */
export function installLocalStoragePolyfill(): void {
  if (typeof window === 'undefined') return;
  if (typeof window.localStorage?.getItem === 'function') return;
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}
