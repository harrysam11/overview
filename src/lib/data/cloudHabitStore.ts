// Cloud implementation (opt-in via VITE_DATA_MODE=cloud). Only loaded dynamically from habitStore.ts.
import { supabase } from "@/integrations/supabase/client";
import type { DailyRecord, Habit, HabitStore } from "./habitStore";

const requireUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user;
};

export const cloudHabitStore: HabitStore = {
  mode: "cloud",
  async listActiveHabits() {
    const { data, error } = await supabase.from("habits").select("*").eq("is_active", true).order("created_at");
    if (error) throw error;
    return (data as Habit[]) || [];
  },
  async addHabit(name, type) {
    const user = await requireUser();
    const { data, error } = await supabase.from("habits").insert({ user_id: user.id, name, type }).select().single();
    if (error) throw error;
    return data as Habit;
  },
  async updateHabit(id, patch) {
    const { error } = await supabase.from("habits").update(patch).eq("id", id);
    if (error) throw error;
  },
  async archiveHabit(id) {
    const { error } = await supabase.from("habits").update({ is_active: false }).eq("id", id);
    if (error) throw error;
  },
  async listRecords(startDate, endDate) {
    const { data, error } = await supabase
      .from("daily_records")
      .select("habit_id, record_date, completed")
      .gte("record_date", startDate)
      .lte("record_date", endDate);
    if (error) throw error;
    return (data as DailyRecord[]) || [];
  },
  async setRecord(date, habitId, completed) {
    const user = await requireUser();
    const { error } = await supabase
      .from("daily_records")
      .upsert({ user_id: user.id, record_date: date, habit_id: habitId, completed }, { onConflict: "user_id,record_date,habit_id" });
    if (error) throw error;
  },
  async ensureDontRecords(date, habits) {
    const user = await requireUser();
    const { data } = await supabase.from("daily_records").select("habit_id").eq("record_date", date);
    const existing = new Set((data || []).map((r) => r.habit_id));
    const rows = habits
      .filter((h) => h.type === "dont" && !existing.has(h.id))
      .map((h) => ({ user_id: user.id, record_date: date, habit_id: h.id, completed: true }));
    if (rows.length) await supabase.from("daily_records").insert(rows);
  },
  async getJournal(date) {
    const { data, error } = await supabase.from("journal_entries").select("content").eq("entry_date", date).maybeSingle();
    if (error) throw error;
    return data?.content || "";
  },
  async listJournalDates(startDate, endDate) {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("entry_date")
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);
    if (error) throw error;
    return (data || []).map((j) => j.entry_date);
  },
  async saveJournal(date, content) {
    const user = await requireUser();
    const { error } = await supabase
      .from("journal_entries")
      .upsert({ user_id: user.id, entry_date: date, content }, { onConflict: "user_id,entry_date" });
    if (error) throw error;
  },
};
