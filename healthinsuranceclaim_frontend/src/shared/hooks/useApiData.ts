import { useState, useEffect, useRef } from 'react';

const activeRequests = new Set<string>();
type ApiFunction<T> = () => Promise<T>;

export const useApiData = <T>(apiFunction: ApiFunction<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const isMounted = useRef(true);
  const requestKey = useRef(Math.random().toString(36));

  useEffect(() => {
    isMounted.current = true;
    
    if (!hasFetched.current) {
      const fetchData = async () => {
        const key = requestKey.current;
        if (activeRequests.has(key)) return;
        
        setLoading(true);
        setError(null);
        activeRequests.add(key);
        
        try {
          const result = await apiFunction();
          if (isMounted.current) {
            setData(result);
            hasFetched.current = true;
          }
        } catch (err) {
          if (isMounted.current) {
            setError(err instanceof Error ? err.message : 'An error occurred');
          }
        } finally {
          activeRequests.delete(key);
          if (isMounted.current) {
            setLoading(false);
          }
        }
      };
      
      fetchData();
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  const refetch = async () => {
    const key = requestKey.current;
    if (activeRequests.has(key)) return;
    
    hasFetched.current = false;
    setLoading(true);
    setError(null);
    activeRequests.add(key);
    
    try {
      const result = await apiFunction();
      if (isMounted.current) {
        setData(result);
        hasFetched.current = true;
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      activeRequests.delete(key);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return { 
    data, 
    loading, 
    error, 
    refetch,
    setError: (errorMsg: string) => setError(errorMsg)
  };
};