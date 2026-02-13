import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  sort_order: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

export const useGoalRoadmap = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGoals = useCallback(async () => {
    try {
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

      const mapped = (goalsData || []).map((g: any) => ({
        ...g,
        milestones: (milestonesData || []).filter((m: any) => m.goal_id === g.id),
      }));
      setGoals(mapped);
    } catch {
      toast({ description: "Failed to load goals.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const addGoal = async (title: string, description?: string, targetDate?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("goals").insert({
      user_id: user.id, title, description: description || null,
      target_date: targetDate || null, sort_order: goals.length,
    });
    if (error) { toast({ description: "Failed to add goal.", variant: "destructive" }); return; }
    toast({ title: "Goal added!" });
    fetchGoals();
  };

  const updateGoal = async (id: string, updates: Partial<{ title: string; description: string; target_date: string; status: string }>) => {
    const { error } = await supabase.from("goals").update(updates).eq("id", id);
    if (error) { toast({ description: "Failed to update goal.", variant: "destructive" }); return; }
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) { toast({ description: "Failed to delete goal.", variant: "destructive" }); return; }
    toast({ title: "Goal deleted." });
    fetchGoals();
  };

  const addMilestone = async (goalId: string, title: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const goal = goals.find(g => g.id === goalId);
    const { error } = await supabase.from("milestones").insert({
      user_id: user.id, goal_id: goalId, title,
      sort_order: goal ? goal.milestones.length : 0,
    });
    if (error) { toast({ description: "Failed to add milestone.", variant: "destructive" }); return; }
    fetchGoals();
  };

  const toggleMilestone = async (id: string, completed: boolean) => {
    const { error } = await supabase.from("milestones").update({ is_completed: !completed }).eq("id", id);
    if (error) { toast({ description: "Failed to update milestone.", variant: "destructive" }); return; }
    fetchGoals();
  };

  const deleteMilestone = async (id: string) => {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) { toast({ description: "Failed to delete milestone.", variant: "destructive" }); return; }
    fetchGoals();
  };

  return { goals, loading, addGoal, updateGoal, deleteGoal, addMilestone, toggleMilestone, deleteMilestone };
};
