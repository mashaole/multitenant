import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then(setData)
      .catch((err: ApiError) => setError(err.message ?? 'Request failed'))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    retry();
  }, [retry]);

  return { data, error, loading, retry };
}
