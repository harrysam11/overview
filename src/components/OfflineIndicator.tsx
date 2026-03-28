import { WifiOff, RefreshCw, Cloud } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300 bg-card border border-border">
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-amber-500" />
          <span className="text-foreground">
            Offline
            {pendingCount > 0 && (
              <span className="text-muted-foreground ml-1">
                · {pendingCount} pending
              </span>
            )}
          </span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 text-primary animate-spin" />
          <span className="text-foreground">Syncing...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-4 w-4 text-primary" />
          <span className="text-foreground">
            {pendingCount} change{pendingCount > 1 ? "s" : ""} to sync
          </span>
        </>
      ) : null}
    </div>
  );
};
