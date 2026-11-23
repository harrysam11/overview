import { newId, nowIso } from "@/lib/local/localDb";
import { localWeeklyPlanSchema, type LocalWeeklyPlan } from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { PlannerStore, WeeklyPlan } from "./plannerStore";

export const localPlannerStore: PlannerStore = {
  mode: "local",

  async listPlans(weekStart: string): Promise<WeeklyPlan[]> {
    const data = await readVaultData();
    const plans = (data.weekly_plans || []).filter((p) => p.week_start === weekStart);
    return [...plans].sort((a, b) => a.sort_order - b.sort_order);
  },

  async addPlan(weekStart: string, title: string, priority: "high" | "medium" | "low"): Promise<WeeklyPlan> {
    const now = nowIso();
    const data = await readVaultData();
    const existing = (data.weekly_plans || []).filter((p) => p.week_start === weekStart);
    const newPlan: LocalWeeklyPlan = localWeeklyPlanSchema.parse({
      id: newId(),
      week_start: weekStart,
      title: title.trim(),
      priority,
      is_completed: false,
      sort_order: existing.length,
      created_at: now,
      updated_at: now,
    });
    await updateVaultData((current) => ({
      ...current,
      weekly_plans: [...(current.weekly_plans || []), newPlan],
    }));
    return newPlan;
  },

  async togglePlan(id: string): Promise<WeeklyPlan | null> {
    const now = nowIso();
    let toggled: WeeklyPlan | null = null;
    await updateVaultData((current) => {
      const plans = (current.weekly_plans || []).map((p) => {
        if (p.id === id) {
          toggled = { ...p, is_completed: !p.is_completed, updated_at: now };
          return toggled as LocalWeeklyPlan;
        }
        return p;
      });
      return { ...current, weekly_plans: plans };
    });
    return toggled;
  },

  async deletePlan(id: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      weekly_plans: (current.weekly_plans || []).filter((p) => p.id !== id),
    }));
  },
};
