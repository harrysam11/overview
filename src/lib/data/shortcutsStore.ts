import { APP_MODE, type AppMode } from "@/lib/appMode";

export interface AppShortcut {
  id: string;
  name: string;
  url: string;
  favicon_url: string | null;
  sort_order: number;
  created_at?: string;
}

export interface ShortcutsStore {
  mode: AppMode;
  listShortcuts(): Promise<AppShortcut[]>;
  addShortcut(name: string, url: string): Promise<AppShortcut>;
  updateShortcut(id: string, name: string, url: string): Promise<void>;
  deleteShortcut(id: string): Promise<void>;
}

let storePromise: Promise<ShortcutsStore> | null = null;

export const getShortcutsStore = (mode: AppMode = APP_MODE): Promise<ShortcutsStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudShortcutsStore").then((m) => m.cloudShortcutsStore)
        : import("./localShortcutsStore").then((m) => m.localShortcutsStore);
  }
  return storePromise;
};
