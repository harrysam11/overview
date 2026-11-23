import { supabase } from "@/integrations/supabase/client";
import type { GoalStore, Goal, Milestone } from "./goalStore";

export const cloudGoalStore: GoalStore = {
  mode: "cloud",

  async listGoals(): Promise<Goal[]> {
    const { data: goalsData, error: goalsError } = await supabase
      .from("goals")
      .select("*")
      .order("sort_order");
    if (goalsError) throw goalsError;

    const { data: milestonesData, error: msError } = await supabase
      .from("milestones")
      .select("*")
      .order("sort_order");
    if (msError) throw msError;

    return (goalsData || []).map((g: any) => ({
      ...g,
      milestones: (milestonesData || []).filter((m: any) => m.goal_id === g.id),
    }));
  },

  async addGoal(title: string, description?: string, targetDate?: string): Promise<Goal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { count } = await supabase
      .from("goals")
      .select("*", { count: "exact", head: true });

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        target_date: targetDate || null,
        sort_order: count || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...(data as any), milestones: [] };
  },

  async updateGoal(id: string, updates: Partial<{ title: string; description: string; target_date: string; status: string }>): Promise<void> {
    const { error } = await supabase.from("goals").update(updates).eq("id", id);
    if (error) throw error;
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;
  },

  async addMilestone(goalId: string, title: string): Promise<Milestone> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { count } = await supabase
      .from("milestones")
      .select("*", { count: "exact", head: true })
      .eq("goal_id", goalId);

    const { data, error } = await supabase
      .from("milestones")
      .insert({
        user_id: user.id,
        goal_id: goalId,
        title,
        sort_order: count || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Milestone;
  },

  async toggleMilestone(id: string, completed: boolean): Promise<void> {
    const { error } = await supabase.from("milestones").update({ is_completed: !completed }).eq("id", id);
    if (error) throw error;
  },

  async deleteMilestone(id: string): Promise<void> {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) throw error;
  },
};
