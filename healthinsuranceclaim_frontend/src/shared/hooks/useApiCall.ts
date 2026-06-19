import { useState, useEffect, useRef } from 'react';

export const useApiCall = <T>(apiFunction: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;

    const fetchData = async () => {
      hasFetched.current = true;
      try {
        const result = await apiFunction();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        hasFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};