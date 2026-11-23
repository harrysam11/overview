import { supabase } from "@/integrations/supabase/client";
import type { ShortcutsStore, AppShortcut } from "./shortcutsStore";

export const cloudShortcutsStore: ShortcutsStore = {
  mode: "cloud",

  async listShortcuts(): Promise<AppShortcut[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("app_shortcuts")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data || []) as AppShortcut[];
  },

  async addShortcut(name: string, url: string): Promise<AppShortcut> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: existing } = await supabase
      .from("app_shortcuts")
      .select("sort_order")
      .eq("user_id", user.id);

    const maxSort = (existing || []).length > 0
      ? Math.max(...(existing || []).map((s) => s.sort_order)) + 1
      : 0;

    const { data, error } = await supabase
      .from("app_shortcuts")
      .insert({
        user_id: user.id,
        name: name.slice(0, 100),
        url: url.slice(0, 2000),
        favicon_url: null,
        sort_order: maxSort,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AppShortcut;
  },

  async updateShortcut(id: string, name: string, url: string): Promise<void> {
    const { error } = await supabase
      .from("app_shortcuts")
      .update({
        name: name.slice(0, 100),
        url: url.slice(0, 2000),
        favicon_url: null,
      })
      .eq("id", id);

    if (error) throw error;
  },

  async deleteShortcut(id: string): Promise<void> {
    const { error } = await supabase.from("app_shortcuts").delete().eq("id", id);
    if (error) throw error;
  },
};
