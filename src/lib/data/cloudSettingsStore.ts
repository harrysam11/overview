import { supabase } from "@/integrations/supabase/client";
import type { SettingsStore, UserProfileSettings } from "./settingsStore";

export const cloudSettingsStore: SettingsStore = {
  mode: "cloud",

  async getSettings(): Promise<UserProfileSettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { username: null, display_name: null, email: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single();

    return {
      username: profile?.username || null,
      display_name: profile?.display_name || null,
      email: user.email || null,
    };
  },

  async saveSettings(patch: { username: string | null; display_name: string | null }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("profiles")
      .update({
        username: patch.username || null,
        display_name: patch.display_name || null,
      })
      .eq("id", user.id);

    if (error) throw error;
  },
};
