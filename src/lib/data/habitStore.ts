import { APP_MODE, type AppMode } from "@/lib/appMode";

export type HabitType = "do" | "dont";

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  is_active: boolean;
  notes?: string | null;
}

export interface DailyRecord {
  habit_id: string;
  record_date: string;
  completed: boolean | null;
}

/** Data contract for the habits + daily records + journal vertical. Both modes implement it. */
export interface HabitStore {
  mode: AppMode;
  listActiveHabits(): Promise<Habit[]>;
  addHabit(name: string, type: HabitType): Promise<Habit>;
  updateHabit(id: string, patch: { name?: string; notes?: string }): Promise<void>;
  /** Soft delete (is_active=false) so history is kept, matching cloud behaviour. */
  archiveHabit(id: string): Promise<void>;
  listRecords(startDate: string, endDate: string): Promise<DailyRecord[]>;
  setRecord(date: string, habitId: string, completed: boolean): Promise<void>;
  /** Mirrors cloud behaviour: create completed=true records for "dont" habits that have none that day. */
  ensureDontRecords(date: string, habits: Habit[]): Promise<void>;
  getJournal(date: string): Promise<string>;
  listJournalDates(startDate: string, endDate: string): Promise<string[]>;
  saveJournal(date: string, content: string): Promise<void>;
}

let storePromise: Promise<HabitStore> | null = null;

/** Cloud code is loaded only when cloud mode is explicitly enabled. */
export const getHabitStore = (mode: AppMode = APP_MODE): Promise<HabitStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudHabitStore").then((m) => m.cloudHabitStore)
        : import("./localHabitStore").then((m) => m.localHabitStore);
  }
  return storePromise;
};
