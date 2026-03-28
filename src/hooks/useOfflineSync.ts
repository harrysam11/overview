import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getSyncQueue,
  removeSyncQueueItem,
  getSyncQueueCount,
} from "@/lib/offlineDb";
import { useToast } from "@/hooks/use-toast";

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();
  const syncingRef = useRef(false);

  const updatePendingCount = useCallback(async () => {
    const count = await getSyncQueueCount();
    setPendingCount(count);
  }, []);

  const syncPendingChanges = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const item of queue) {
        try {
          const tableName = item.table as any;
          let error: any = null;

          if (item.operation === "insert") {
            ({ error } = await supabase.from(tableName).insert(item.data as any));
          } else if (item.operation === "update") {
            const { id: rowId, ...rest } = item.data;
            ({ error } = await supabase.from(tableName).update(rest as any).eq("id", rowId as string));
          } else if (item.operation === "upsert") {
            ({ error } = await supabase
              .from(tableName)
              .upsert(item.data as any, item.conflictColumn ? { onConflict: item.conflictColumn } : undefined));
          } else if (item.operation === "delete") {
            ({ error } = await supabase.from(tableName).delete().eq("id", item.data.id as string));
          }

          if (error) {
            console.error("Sync error for item:", item.id, error);
            failed++;
          } else {
            await removeSyncQueueItem(item.id);
            synced++;
          }
        } catch (err) {
          console.error("Sync item failed:", err);
          failed++;
        }
      }

      await updatePendingCount();

      if (synced > 0) {
        toast({
          description: `✅ Synced ${synced} offline change${synced > 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`,
        });
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, [toast, updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingChanges();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check pending on mount
    updatePendingCount();

    // Try syncing on mount if online
    if (navigator.onLine) {
      syncPendingChanges();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingChanges, updatePendingCount]);

  return { isOnline, isSyncing, pendingCount, syncPendingChanges, updatePendingCount };
};
