import { APP_MODE, type AppMode } from "@/lib/appMode";

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  sort_order: number;
  milestones: Milestone[];
}

export interface GoalStore {
  mode: AppMode;
  listGoals(): Promise<Goal[]>;
  addGoal(title: string, description?: string, targetDate?: string): Promise<Goal>;
  updateGoal(id: string, updates: Partial<{ title: string; description: string; target_date: string; status: string }>): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  addMilestone(goalId: string, title: string): Promise<Milestone>;
  toggleMilestone(id: string, completed: boolean): Promise<void>;
  deleteMilestone(id: string): Promise<void>;
}

let storePromise: Promise<GoalStore> | null = null;

export const getGoalStore = (mode: AppMode = APP_MODE): Promise<GoalStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudGoalStore").then((m) => m.cloudGoalStore)
        : import("./localGoalStore").then((m) => m.localGoalStore);
  }
  return storePromise;
};
