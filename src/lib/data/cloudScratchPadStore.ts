import { supabase } from "@/integrations/supabase/client";
import type { ScratchPadStore } from "./scratchPadStore";

export const cloudScratchPadStore: ScratchPadStore = {
  mode: "cloud",

  async getNotes(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";

    const { data, error } = await supabase
      .from("scratch_pad")
      .select("content")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.content || "";
  },

  async saveNotes(content: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("scratch_pad")
      .upsert({ user_id: user.id, content }, { onConflict: "user_id" });

    if (error) throw error;
  },
};
