import { nowIso } from "@/lib/local/localDb";
import { localSettingsSchema } from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { SettingsStore, UserProfileSettings } from "./settingsStore";

export const localSettingsStore: SettingsStore = {
  mode: "local",

  async getSettings(): Promise<UserProfileSettings> {
    const data = await readVaultData();
    const settings = data.settings || { username: null, display_name: null };
    return {
      username: settings.username || null,
      display_name: settings.display_name || null,
      email: "local@offline",
    };
  },

  async saveSettings(patch: { username: string | null; display_name: string | null }): Promise<void> {
    const validated = localSettingsSchema.parse({
      username: patch.username?.trim() || null,
      display_name: patch.display_name?.trim() || null,
      updated_at: nowIso(),
    });
    await updateVaultData((current) => ({
      ...current,
      settings: validated,
    }));
  },
};
