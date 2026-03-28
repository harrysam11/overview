import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedData, setCachedData, addToSyncQueue } from "@/lib/offlineDb";

/**
 * Hook to wrap Supabase queries with offline caching and mutation queueing.
 */
export const useOfflineQuery = () => {
  /**
   * Fetch data with offline fallback. Tries network first, falls back to cache.
   */
  const fetchWithCache = useCallback(async <T>(
    cacheKey: string,
    queryFn: () => Promise<{ data: T | null; error: any }>
  ): Promise<T | null> => {
    if (navigator.onLine) {
      try {
        const { data, error } = await queryFn();
        if (!error && data !== null) {
          await setCachedData(cacheKey, data);
          return data;
        }
        // If network error, fall back to cache
        if (error) {
          console.warn("Network query failed, using cache:", error.message);
          const cached = await getCachedData<T>(cacheKey);
          return cached ?? null;
        }
        return data;
      } catch {
        const cached = await getCachedData<T>(cacheKey);
        return cached ?? null;
      }
    } else {
      const cached = await getCachedData<T>(cacheKey);
      return cached ?? null;
    }
  }, []);

  /**
   * Perform a mutation. If offline, queue it and update local cache optimistically.
   */
  const mutateWithQueue = useCallback(async (options: {
    table: string;
    operation: "insert" | "update" | "upsert" | "delete";
    data: Record<string, unknown>;
    conflictColumn?: string;
    cacheKey?: string;
    optimisticUpdate?: (cached: any) => any;
  }) => {
    const { table, operation, data, conflictColumn, cacheKey, optimisticUpdate } = options;

    if (navigator.onLine) {
      const tableName = table as any;
      let result: any;

      if (operation === "insert") {
        result = await supabase.from(tableName).insert(data as any);
      } else if (operation === "update") {
        const { id, ...rest } = data;
        result = await supabase.from(tableName).update(rest as any).eq("id", id as string);
      } else if (operation === "upsert") {
        result = await supabase
          .from(tableName)
          .upsert(data as any, conflictColumn ? { onConflict: conflictColumn } : undefined);
      } else if (operation === "delete") {
        result = await supabase.from(tableName).delete().eq("id", data.id as string);
      }

      if (result?.error) {
        throw result.error;
      }
      return result;
    } else {
      // Queue for later sync
      await addToSyncQueue({ table, operation, data, conflictColumn });

      // Optimistic local cache update
      if (cacheKey && optimisticUpdate) {
        const cached = await getCachedData(cacheKey);
        if (cached) {
          const updated = optimisticUpdate(cached);
          await setCachedData(cacheKey, updated);
        }
      }

      return { data: null, error: null, offline: true };
    }
  }, []);

  return { fetchWithCache, mutateWithQueue };
};
