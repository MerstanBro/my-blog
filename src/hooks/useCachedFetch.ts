import { useEffect, useState } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: {
    cacheDuration?: number;
    refetchOnMount?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheDuration = options?.cacheDuration || CACHE_DURATION;
  const refetchOnMount = options?.refetchOnMount ?? false;

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        // Check cache first
        const cachedEntry = cache.get(key);
        const now = Date.now();

        if (cachedEntry && now - cachedEntry.timestamp < cacheDuration && !refetchOnMount) {
          if (isMounted) {
            setData(cachedEntry.data as T);
            setLoading(false);
          }
          return;
        }

        // Fetch fresh data
        setLoading(true);
        const result = await fetchFn();

        // Update cache
        cache.set(key, {
          data: result,
          timestamp: now,
        });

        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cacheDuration, refetchOnMount]);

  return { data, loading, error };
}

// Clear cache for a specific key
export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}


