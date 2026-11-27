/**
 * App data mode.
 * Local-first is enforced while the legacy cloud data stores still exist.
 * Optional cloud access is provided only by encryptedCloudVault.ts; do not
 * enable the legacy table-backed cloud routes until every store is migrated.
 */
export type AppMode = "local" | "cloud";

/** Legacy table-backed cloud mode is intentionally disabled to prevent plaintext writes. */
export const resolveAppMode = (_raw: unknown): AppMode => "local";

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
