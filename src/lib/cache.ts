/**
 * Advanced caching utilities for Next.js
 * Implements multiple caching layers for optimal performance
 */

import { unstable_cache } from 'next/cache';

// Cache tags for granular revalidation
export const CACHE_TAGS = {
  BLOG_POST: 'blog-post',
  BLOG_LIST: 'blog-list',
  BLOG_DETAILS: 'blog-details',
  CONTENT: 'content',
} as const;

/**
 * Create a cached function with automatic tagging
 * Uses Next.js built-in cache with tags for revalidation
 */
export function createCachedFn<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    tags: string[];
    revalidate?: number; // in seconds
    keyPrefix?: string;
  }
): T {
  return unstable_cache(
    fn,
    options.keyPrefix ? [options.keyPrefix] : undefined,
    {
      tags: options.tags,
      revalidate: options.revalidate,
    }
  ) as T;
}

/**
 * Memory cache for client-side caching
 */
class MemoryCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

  set(key: string, data: unknown, ttl: number = 300000) {
    // Default 5 min TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const memoryCache = new MemoryCache();

/**
 * Stale-while-revalidate pattern
 * Returns cached data immediately while fetching fresh data in the background
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300000
): Promise<T> {
  const cached = memoryCache.get<T>(key);

  if (cached) {
    // Return cached data immediately
    // Revalidate in the background
    fetchFn().then((freshData) => {
      memoryCache.set(key, freshData, ttl);
    }).catch(console.error);
    
    return cached;
  }

  // No cache, fetch and store
  const data = await fetchFn();
  memoryCache.set(key, data, ttl);
  return data;
}

/**
 * Preload data for faster navigation
 */
export function preloadData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): void {
  if (typeof window === 'undefined') return;
  
  // Check if already cached
  if (memoryCache.has(key)) return;

  // Preload in the background
  fetchFn().then((data) => {
    memoryCache.set(key, data, ttl);
  }).catch((error) => {
    console.error(`Failed to preload data for key: ${key}`, error);
  });
}

/**
 * Batch cache operations
 */
export async function batchCache<T>(
  operations: Array<{
    key: string;
    fetchFn: () => Promise<T>;
    ttl?: number;
  }>
): Promise<Map<string, T>> {
  const results = new Map<string, T>();

  await Promise.allSettled(
    operations.map(async ({ key, fetchFn, ttl }) => {
      try {
        const data = await fetchFn();
        memoryCache.set(key, data, ttl);
        results.set(key, data);
      } catch (error) {
        console.error(`Batch cache failed for key: ${key}`, error);
      }
    })
  );

  return results;
}

/**
 * Cache key generator with proper serialization
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, unknown>);

  return `${prefix}:${JSON.stringify(sortedParams)}`;
}


