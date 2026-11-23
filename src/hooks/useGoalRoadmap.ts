import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getGoalStore, type Goal, type Milestone } from "@/lib/data/goalStore";

export type { Goal, Milestone };

export const useGoalRoadmap = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGoals = useCallback(async () => {
    try {
      const store = await getGoalStore();
      const data = await store.listGoals();
      setGoals(data);
    } catch {
      toast({ description: "Failed to load goals.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (title: string, description?: string, targetDate?: string) => {
    try {
      const store = await getGoalStore();
      await store.addGoal(title, description, targetDate);
      toast({ title: "Goal added!" });
      fetchGoals();
    } catch {
      toast({ description: "Failed to add goal.", variant: "destructive" });
    }
  };

  const updateGoal = async (id: string, updates: Partial<{ title: string; description: string; target_date: string; status: string }>) => {
    try {
      const store = await getGoalStore();
      await store.updateGoal(id, updates);
      fetchGoals();
    } catch {
      toast({ description: "Failed to update goal.", variant: "destructive" });
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const store = await getGoalStore();
      await store.deleteGoal(id);
      toast({ title: "Goal deleted." });
      fetchGoals();
    } catch {
      toast({ description: "Failed to delete goal.", variant: "destructive" });
    }
  };

  const addMilestone = async (goalId: string, title: string) => {
    try {
      const store = await getGoalStore();
      await store.addMilestone(goalId, title);
      fetchGoals();
    } catch {
      toast({ description: "Failed to add milestone.", variant: "destructive" });
    }
  };

  const toggleMilestone = async (id: string, completed: boolean) => {
    try {
      const store = await getGoalStore();
      await store.toggleMilestone(id, completed);
      fetchGoals();
    } catch {
      toast({ description: "Failed to update milestone.", variant: "destructive" });
    }
  };

  const deleteMilestone = async (id: string) => {
    try {
      const store = await getGoalStore();
      await store.deleteMilestone(id);
      fetchGoals();
    } catch {
      toast({ description: "Failed to delete milestone.", variant: "destructive" });
    }
  };

  return { goals, loading, addGoal, updateGoal, deleteGoal, addMilestone, toggleMilestone, deleteMilestone };
};
