import { useState, useEffect, useCallback } from "react";
import { startOfWeek, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WeeklyPlan {
  id: string;
  week_start: string;
  title: string;
  priority: "high" | "medium" | "low";
  is_completed: boolean;
  sort_order: number;
}

export const useWeeklyPlanner = (weekDate: Date) => {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const weekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const loadPlans = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .order("sort_order");

      if (error) throw error;
      setPlans((data || []) as WeeklyPlan[]);
    } catch {
      toast({ description: "Failed to load weekly plans.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [weekStart, toast]);

  useEffect(() => { setLoading(true); loadPlans(); }, [loadPlans]);

  const addPlan = async (title: string, priority: "high" | "medium" | "low") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("weekly_plans")
        .insert({ user_id: user.id, week_start: weekStart, title, priority, sort_order: plans.length })
        .select()
        .single();

      if (error) throw error;
      setPlans([...plans, data as WeeklyPlan]);
    } catch {
      toast({ description: "Failed to add plan.", variant: "destructive" });
    }
  };

  const togglePlan = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    try {
      const { error } = await supabase
        .from("weekly_plans")
        .update({ is_completed: !plan.is_completed })
        .eq("id", id);
      if (error) throw error;
      setPlans(plans.map(p => p.id === id ? { ...p, is_completed: !p.is_completed } : p));
    } catch {
      toast({ description: "Failed to update plan.", variant: "destructive" });
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const { error } = await supabase.from("weekly_plans").delete().eq("id", id);
      if (error) throw error;
      setPlans(plans.filter(p => p.id !== id));
    } catch {
      toast({ description: "Failed to delete plan.", variant: "destructive" });
    }
  };

  const completedCount = plans.filter(p => p.is_completed).length;
  const progress = plans.length > 0 ? Math.round((completedCount / plans.length) * 100) : 0;

  return { plans, loading, addPlan, togglePlan, deletePlan, weekStart, completedCount, progress };
};
