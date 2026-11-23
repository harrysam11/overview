import { useState, useEffect, useCallback } from "react";
import { startOfWeek, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getPlannerStore, type WeeklyPlan } from "@/lib/data/plannerStore";

export type { WeeklyPlan };

export const useWeeklyPlanner = (weekDate: Date) => {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const weekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const loadPlans = useCallback(async () => {
    try {
      const store = await getPlannerStore();
      const data = await store.listPlans(weekStart);
      setPlans(data);
    } catch {
      toast({ description: "Failed to load weekly plans.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [weekStart, toast]);

  useEffect(() => {
    setLoading(true);
    loadPlans();
  }, [loadPlans]);

  const addPlan = async (title: string, priority: "high" | "medium" | "low") => {
    try {
      const store = await getPlannerStore();
      const newPlan = await store.addPlan(weekStart, title, priority);
      setPlans((prev) => [...prev, newPlan]);
    } catch {
      toast({ description: "Failed to add plan.", variant: "destructive" });
    }
  };

  const togglePlan = async (id: string) => {
    try {
      const store = await getPlannerStore();
      const updated = await store.togglePlan(id);
      if (updated) {
        setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    } catch {
      toast({ description: "Failed to update plan.", variant: "destructive" });
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const store = await getPlannerStore();
      await store.deletePlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast({ description: "Failed to delete plan.", variant: "destructive" });
    }
  };

  const completedCount = plans.filter((p) => p.is_completed).length;
  const progress = plans.length > 0 ? Math.round((completedCount / plans.length) * 100) : 0;

  return { plans, loading, addPlan, togglePlan, deletePlan, weekStart, completedCount, progress };
};
