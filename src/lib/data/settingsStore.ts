import { APP_MODE, type AppMode } from "@/lib/appMode";

export interface UserProfileSettings {
  username: string | null;
  display_name: string | null;
  email?: string | null;
}

export interface SettingsStore {
  mode: AppMode;
  getSettings(): Promise<UserProfileSettings>;
  saveSettings(patch: { username: string | null; display_name: string | null }): Promise<void>;
}

let storePromise: Promise<SettingsStore> | null = null;

export const getSettingsStore = (mode: AppMode = APP_MODE): Promise<SettingsStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudSettingsStore").then((m) => m.cloudSettingsStore)
        : import("./localSettingsStore").then((m) => m.localSettingsStore);
  }
  return storePromise;
};
