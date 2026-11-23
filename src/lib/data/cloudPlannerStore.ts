import { supabase } from "@/integrations/supabase/client";
import type { PlannerStore, WeeklyPlan } from "./plannerStore";

export const cloudPlannerStore: PlannerStore = {
  mode: "cloud",

  async listPlans(weekStart: string): Promise<WeeklyPlan[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .order("sort_order");

    if (error) throw error;
    return (data || []) as WeeklyPlan[];
  },

  async addPlan(weekStart: string, title: string, priority: "high" | "medium" | "low"): Promise<WeeklyPlan> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { count } = await supabase
      .from("weekly_plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("week_start", weekStart);

    const { data, error } = await supabase
      .from("weekly_plans")
      .insert({
        user_id: user.id,
        week_start: weekStart,
        title,
        priority,
        sort_order: count || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WeeklyPlan;
  },

  async togglePlan(id: string): Promise<WeeklyPlan | null> {
    const { data: current, error: fetchErr } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr || !current) throw fetchErr || new Error("Plan not found");

    const { data, error } = await supabase
      .from("weekly_plans")
      .update({ is_completed: !current.is_completed })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as WeeklyPlan;
  },

  async deletePlan(id: string): Promise<void> {
    const { error } = await supabase.from("weekly_plans").delete().eq("id", id);
    if (error) throw error;
  },
};
