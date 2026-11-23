import { supabase } from "@/integrations/supabase/client";
import type { LevelStore } from "./levelStore";
import type { LevelDefinition } from "./defaultLevels";

export const cloudLevelStore: LevelStore = {
  mode: "cloud",

  async listLevels(): Promise<LevelDefinition[]> {
    const { data, error } = await supabase
      .from("level_definitions")
      .select("*")
      .order("level");
    if (error) throw error;
    return (data || []) as LevelDefinition[];
  },

  async getTotalXp(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from("user_levels")
      .select("total_xp")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.total_xp || 0;
  },

  async addXp(amount: number): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { error } = await supabase.rpc("increment_xp", { p_amount: amount });
    if (error) throw error;

    const { data } = await supabase
      .from("user_levels")
      .select("total_xp")
      .eq("user_id", user.id)
      .maybeSingle();

    return data?.total_xp || 0;
  },
};
