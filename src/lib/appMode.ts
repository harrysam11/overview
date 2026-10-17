/**
 * App data mode.
 * - "local" (default): all supported data lives in this browser (IndexedDB). The
 *   cloud client is never imported, so no auth, realtime or sync requests happen.
 * - "cloud": legacy hosted backend. Opt-in only via VITE_DATA_MODE=cloud.
 */
export type AppMode = "local" | "cloud";

export const resolveAppMode = (raw: unknown): AppMode =>
  typeof raw === "string" && raw.trim().toLowerCase() === "cloud" ? "cloud" : "local";

export const APP_MODE: AppMode = resolveAppMode(import.meta.env.VITE_DATA_MODE);
export const isLocalMode = APP_MODE === "local";
export const isCloudMode = APP_MODE === "cloud";

/** Best-effort request so the browser does not evict local data under storage pressure. */
export const requestPersistentStorage = async (): Promise<boolean | null> => {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
};
