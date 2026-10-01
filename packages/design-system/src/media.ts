export function mediaStore(query: string) {
  return {
    subscribe(this: void, listener: () => void): () => void {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    },
    snapshot(this: void): boolean {
      return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false;
    },
  };
}

export const serverSnapshot = () => false;
