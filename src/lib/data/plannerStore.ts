import { APP_MODE, type AppMode } from "@/lib/appMode";

export interface WeeklyPlan {
  id: string;
  week_start: string;
  title: string;
  priority: "high" | "medium" | "low";
  is_completed: boolean;
  sort_order: number;
}

export interface PlannerStore {
  mode: AppMode;
  listPlans(weekStart: string): Promise<WeeklyPlan[]>;
  addPlan(weekStart: string, title: string, priority: "high" | "medium" | "low"): Promise<WeeklyPlan>;
  togglePlan(id: string): Promise<WeeklyPlan | null>;
  deletePlan(id: string): Promise<void>;
}

let storePromise: Promise<PlannerStore> | null = null;

export const getPlannerStore = (mode: AppMode = APP_MODE): Promise<PlannerStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudPlannerStore").then((m) => m.cloudPlannerStore)
        : import("./localPlannerStore").then((m) => m.localPlannerStore);
  }
  return storePromise;
};
