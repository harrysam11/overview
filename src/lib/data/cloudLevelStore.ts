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

  async addXp(_amount: number): Promise<number> {
    // Never trust XP amounts supplied by a browser. Cloud XP awards remain
    // disabled until they are issued by a server-authoritative event flow.
    throw new Error(
      "Cloud XP awards are disabled until server-authoritative awarding is implemented.",
    );
  },
};
