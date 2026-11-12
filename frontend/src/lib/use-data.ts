"use client";

import { useCallback, useEffect, useState } from "react";

/** Loads data from an api call and exposes loading/error state plus a reload function. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(load, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    reload()
      .then((d) => active && (setData(d), setError(null)))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reload]);

  return { data, setData, error, loading, reload: () => reload().then(setData) };
}
