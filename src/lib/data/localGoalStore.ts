import { newId, nowIso } from "@/lib/local/localDb";
import { localGoalSchema, localMilestoneSchema, type LocalGoal, type LocalMilestone } from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { GoalStore, Goal, Milestone } from "./goalStore";

export const localGoalStore: GoalStore = {
  mode: "local",

  async listGoals(): Promise<Goal[]> {
    const data = await readVaultData();
    const goals = data.goals || [];
    const milestones = data.milestones || [];
    const sortedGoals = [...goals].sort((a, b) => a.sort_order - b.sort_order);
    return sortedGoals.map((g) => ({
      ...g,
      milestones: milestones
        .filter((m) => m.goal_id === g.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  },

  async addGoal(title: string, description?: string, targetDate?: string): Promise<Goal> {
    const now = nowIso();
    const data = await readVaultData();
    const existing = data.goals || [];
    const newGoal: LocalGoal = localGoalSchema.parse({
      id: newId(),
      title: title.trim(),
      description: description?.trim() || null,
      target_date: targetDate || null,
      status: "active",
      sort_order: existing.length,
      created_at: now,
      updated_at: now,
    });
    await updateVaultData((current) => ({
      ...current,
      goals: [...(current.goals || []), newGoal],
    }));
    return { ...newGoal, milestones: [] };
  },

  async updateGoal(id: string, updates: Partial<{ title: string; description: string; target_date: string; status: string }>): Promise<void> {
    const now = nowIso();
    await updateVaultData((current) => ({
      ...current,
      goals: (current.goals || []).map((g) =>
        g.id === id ? { ...g, ...updates, updated_at: now } : g
      ),
    }));
  },

  async deleteGoal(id: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      goals: (current.goals || []).filter((g) => g.id !== id),
      milestones: (current.milestones || []).filter((m) => m.goal_id !== id),
    }));
  },

  async addMilestone(goalId: string, title: string): Promise<Milestone> {
    const now = nowIso();
    const data = await readVaultData();
    const existing = (data.milestones || []).filter((m) => m.goal_id === goalId);
    const newMilestone: LocalMilestone = localMilestoneSchema.parse({
      id: newId(),
      goal_id: goalId,
      title: title.trim(),
      is_completed: false,
      sort_order: existing.length,
      created_at: now,
    });
    await updateVaultData((current) => ({
      ...current,
      milestones: [...(current.milestones || []), newMilestone],
    }));
    return newMilestone;
  },

  async toggleMilestone(id: string, completed: boolean): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      milestones: (current.milestones || []).map((m) =>
        m.id === id ? { ...m, is_completed: !completed } : m
      ),
    }));
  },

  async deleteMilestone(id: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      milestones: (current.milestones || []).filter((m) => m.id !== id),
    }));
  },
};
