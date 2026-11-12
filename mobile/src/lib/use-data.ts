import { useCallback, useEffect, useState } from "react";

/** Loads data from an api call and exposes loading/error state, a reload function and pull-to-refresh state. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetcher = useCallback(load, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetcher()
      .then((d) => active && (setData(d), setError(null)))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetcher]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await fetcher());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [fetcher]);

  return { data, setData, error, loading, refreshing, refresh };
}
