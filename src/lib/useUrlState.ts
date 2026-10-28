import { useEffect, useState } from 'react';

/** 将筛选状态同步到 URL(query string), 刷新/分享后保留。 */
export function useUrlState<T>(parse: (search: string) => T, serialize: (s: T) => string, defaults: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults;
    return parse(window.location.search);
  });

  useEffect(() => {
    const s = serialize(state);
    try {
      const url = new URL(window.location.href);
      history.replaceState(null, '', url.pathname + s);
    } catch {
      /* ignore */
    }
  }, [state, serialize]);

  return [state, setState] as const;
}
