import { habitNameSchema } from "@/lib/validation";
import { LocalStoreError, newId, nowIso } from "@/lib/local/localDb";
import { isDateString, LIMITS, type LocalDailyRecord, type LocalHabit, type LocalJournalEntry } from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { DailyRecord, Habit, HabitStore, HabitType } from "./habitStore";

const assertDate = (date: string) => {
  if (!isDateString(date)) throw new LocalStoreError("Invalid date.");
};

const wrap = async <T>(message: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof LocalStoreError) throw error;
    if (error instanceof Error && error.name === "LocalVaultError") throw error;
    throw new LocalStoreError(message, error);
  }
};

const toHabit = (habit: LocalHabit): Habit => ({
  id: habit.id,
  name: habit.name,
  type: habit.type,
  is_active: habit.is_active,
  notes: habit.notes,
});

export const localHabitStore: HabitStore = {
  mode: "local",

  listActiveHabits: () => wrap("Could not load habits.", async () =>
    (await readVaultData()).habits.filter((habit) => habit.is_active).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(toHabit)),

  addHabit: (name: string, type: HabitType) => wrap("Could not add habit.", async () => {
    const parsed = habitNameSchema.safeParse(name);
    if (!parsed.success) throw new LocalStoreError(parsed.error.issues[0]?.message ?? "Invalid habit name.");
    if (type !== "do" && type !== "dont") throw new LocalStoreError("Invalid habit type.");
    const stamp = nowIso();
    const habit: LocalHabit = { id: newId(), name: parsed.data, type, is_active: true, notes: null, created_at: stamp, updated_at: stamp };
    await updateVaultData((data) => ({ ...data, habits: [...data.habits, habit] }));
    return toHabit(habit);
  }),

  updateHabit: (id, patch) => wrap("Could not update habit.", async () => {
    let found = false;
    await updateVaultData((data) => ({
      ...data,
      habits: data.habits.map((habit) => {
        if (habit.id !== id) return habit;
        found = true;
        const updated = { ...habit, updated_at: nowIso() };
        if (patch.name !== undefined) {
          const parsed = habitNameSchema.safeParse(patch.name);
          if (!parsed.success) throw new LocalStoreError(parsed.error.issues[0]?.message ?? "Invalid habit name.");
          updated.name = parsed.data;
        }
        if (patch.notes !== undefined) {
          if (patch.notes.length > LIMITS.habitNotes) throw new LocalStoreError("Notes are too long.");
          updated.notes = patch.notes;
        }
        return updated;
      }),
    }));
    if (!found) throw new LocalStoreError("Habit not found.");
  }),

  archiveHabit: (id) => wrap("Could not delete habit.", async () => {
    let found = false;
    await updateVaultData((data) => ({
      ...data,
      habits: data.habits.map((habit) => {
        if (habit.id !== id) return habit;
        found = true;
        return { ...habit, is_active: false, updated_at: nowIso() };
      }),
    }));
    if (!found) throw new LocalStoreError("Habit not found.");
  }),

  listRecords: (startDate, endDate) => wrap("Could not load records.", async () => {
    assertDate(startDate);
    assertDate(endDate);
    const data = await readVaultData();
    return data.daily_records.filter((record) => record.record_date >= startDate && record.record_date <= endDate)
      .map<DailyRecord>((record) => ({ habit_id: record.habit_id, record_date: record.record_date, completed: record.completed }));
  }),

  setRecord: (date, habitId, completed) => wrap("Could not update habit.", async () => {
    assertDate(date);
    let foundHabit = false;
    await updateVaultData((data) => {
      foundHabit = data.habits.some((habit) => habit.id === habitId);
      if (!foundHabit) throw new LocalStoreError("Habit not found.");
      const stamp = nowIso();
      const index = data.daily_records.findIndex((record) => record.record_date === date && record.habit_id === habitId);
      const daily_records = [...data.daily_records];
      if (index >= 0) daily_records[index] = { ...daily_records[index], completed, updated_at: stamp };
      else daily_records.push({ id: newId(), habit_id: habitId, record_date: date, completed, created_at: stamp, updated_at: stamp });
      return { ...data, daily_records };
    });
  }),

  ensureDontRecords: (date, habits) => wrap("Could not prepare today's habits.", async () => {
    assertDate(date);
    const dontHabits = habits.filter((habit) => habit.type === "dont");
    if (dontHabits.length === 0) return;
    await updateVaultData((data) => {
      const existing = new Set(data.daily_records.filter((record) => record.record_date === date).map((record) => record.habit_id));
      const stamp = nowIso();
      const additions: LocalDailyRecord[] = dontHabits.filter((habit) => !existing.has(habit.id)).map((habit) => ({
        id: newId(), habit_id: habit.id, record_date: date, completed: true, created_at: stamp, updated_at: stamp,
      }));
      return { ...data, daily_records: [...data.daily_records, ...additions] };
    });
  }),

  getJournal: (date) => wrap("Could not load journal.", async () => {
    assertDate(date);
    return (await readVaultData()).journal_entries.find((entry) => entry.entry_date === date)?.content ?? "";
  }),

  listJournalDates: (startDate, endDate) => wrap("Could not load journal.", async () => {
    assertDate(startDate);
    assertDate(endDate);
    return (await readVaultData()).journal_entries.filter((entry) => entry.entry_date >= startDate && entry.entry_date <= endDate && entry.content.trim().length > 0)
      .map((entry) => entry.entry_date);
  }),

  saveJournal: (date, content) => wrap("Could not save journal.", async () => {
    assertDate(date);
    if (content.length > LIMITS.journalContent) throw new LocalStoreError("Journal entry is too long.");
    await updateVaultData((data) => {
      const stamp = nowIso();
      const existing = data.journal_entries.find((entry) => entry.entry_date === date);
      const entry: LocalJournalEntry = existing
        ? { ...existing, content, updated_at: stamp }
        : { id: newId(), entry_date: date, content, created_at: stamp, updated_at: stamp };
      return { ...data, journal_entries: existing
        ? data.journal_entries.map((item) => item.id === existing.id ? entry : item)
        : [...data.journal_entries, entry] };
    });
  }),
};