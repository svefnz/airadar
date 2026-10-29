import { useEffect, useState, useRef } from 'react';

/** 将筛选与视图状态同步到 URL (query string), 刷新/分享后保留。 */
export function useUrlState<T>(parse: (search: string) => T, serialize: (s: T) => string, defaults: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults;
    return parse(window.location.search);
  });

  const isMountedRef = useRef(false);

  // Hydration sync: ensure client search parameters take precedence over SSR defaults
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      setState(parse(window.location.search));
    }
    isMountedRef.current = true;
  }, [parse]);

  // Update URL on state change (only after initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    const s = serialize(state);
    try {
      const url = new URL(window.location.href);
      history.replaceState(null, '', url.pathname + s);
    } catch {
      /* ignore */
    }
  }, [state, serialize]);

  // Support browser Back / Forward buttons
  useEffect(() => {
    const onPopState = () => {
      setState(parse(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [parse]);

  return [state, setState] as const;
}
