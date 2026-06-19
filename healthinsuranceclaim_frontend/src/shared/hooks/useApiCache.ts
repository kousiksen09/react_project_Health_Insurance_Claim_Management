import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  error?: Error;
}

const CACHE_DURATION = 30000; 

export const useApiCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean;
    staleTime?: number;
  } = {}
) => {
  const { enabled = true, staleTime = CACHE_DURATION } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const cacheRef = useRef(new Map<string, CacheEntry<T>>());
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!enabled || isLoadingRef.current) return;

    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < staleTime) {
      if (isMountedRef.current) {
        setData(cached.data);
        setError(cached.error || null);
        setLoading(false);
      }
      return;
    }

    isLoadingRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcher();
      
      if (isMountedRef.current) {
        setData(result);
        setLoading(false);
        
        cacheRef.current.set(key, {
          data: result,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      const error = err as Error;
      
      if (isMountedRef.current && error.name !== 'AbortError') {
        setError(error);
        setLoading(false);
        
        cacheRef.current.set(key, {
          data: null as T,
          timestamp: Date.now(),
          error
        });
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [key, fetcher, enabled, staleTime]);

  const refetch = useCallback(() => {

    cacheRef.current.delete(key);
    fetchData();
  }, [key, fetchData]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, enabled]);


  useEffect(() => {
    return () => {
      const fiveMinutesAgo = Date.now() - 300000;
      for (const [cacheKey, entry] of cacheRef.current.entries()) {
        if (entry.timestamp < fiveMinutesAgo) {
          cacheRef.current.delete(cacheKey);
        }
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
};