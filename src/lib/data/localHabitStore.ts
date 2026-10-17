import { habitNameSchema } from "@/lib/validation";
import { getLocalDb, LocalStoreError, newId, nowIso } from "@/lib/local/localDb";
import { isDateString, LIMITS, type LocalHabit } from "@/lib/local/schema";
import type { DailyRecord, Habit, HabitStore, HabitType } from "./habitStore";

const assertDate = (d: string) => {
  if (!isDateString(d)) throw new LocalStoreError("Invalid date.");
};

const wrap = async <T>(message: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof LocalStoreError) throw err;
    throw new LocalStoreError(message, err);
  }
};

const toHabit = (h: LocalHabit): Habit => ({ id: h.id, name: h.name, type: h.type, is_active: h.is_active, notes: h.notes });

export const localHabitStore: HabitStore = {
  mode: "local",

  listActiveHabits: () =>
    wrap("Could not load habits.", async () => {
      const db = await getLocalDb();
      const all = await db.getAll("habits");
      return all
        .filter((h) => h.is_active)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(toHabit);
    }),

  addHabit: (name: string, type: HabitType) =>
    wrap("Could not add habit.", async () => {
      const parsed = habitNameSchema.safeParse(name);
      if (!parsed.success) throw new LocalStoreError(parsed.error.errors[0].message);
      if (type !== "do" && type !== "dont") throw new LocalStoreError("Invalid habit type.");
      const ts = nowIso();
      const habit: LocalHabit = { id: newId(), name: parsed.data, type, is_active: true, notes: null, created_at: ts, updated_at: ts };
      const db = await getLocalDb();
      await db.add("habits", habit);
      return toHabit(habit);
    }),

  updateHabit: (id, patch) =>
    wrap("Could not update habit.", async () => {
      const db = await getLocalDb();
      const tx = db.transaction("habits", "readwrite");
      const existing = await tx.store.get(id);
      if (!existing) throw new LocalStoreError("Habit not found.");
      const next = { ...existing, updated_at: nowIso() };
      if (patch.name !== undefined) {
        const parsed = habitNameSchema.safeParse(patch.name);
        if (!parsed.success) throw new LocalStoreError(parsed.error.errors[0].message);
        next.name = parsed.data;
      }
      if (patch.notes !== undefined) {
        if (patch.notes.length > LIMITS.habitNotes) throw new LocalStoreError("Notes are too long.");
        next.notes = patch.notes;
      }
      await tx.store.put(next);
      await tx.done;
    }),

  archiveHabit: (id) =>
    wrap("Could not delete habit.", async () => {
      const db = await getLocalDb();
      const tx = db.transaction("habits", "readwrite");
      const existing = await tx.store.get(id);
      if (!existing) throw new LocalStoreError("Habit not found.");
      await tx.store.put({ ...existing, is_active: false, updated_at: nowIso() });
      await tx.done;
    }),

  listRecords: (startDate, endDate) =>
    wrap("Could not load records.", async () => {
      assertDate(startDate);
      assertDate(endDate);
      const db = await getLocalDb();
      const rows = await db.getAllFromIndex("daily_records", "by_date", IDBKeyRange.bound(startDate, endDate));
      return rows.map<DailyRecord>((r) => ({ habit_id: r.habit_id, record_date: r.record_date, completed: r.completed }));
    }),

  setRecord: (date, habitId, completed) =>
    wrap("Could not update habit.", async () => {
      assertDate(date);
      const db = await getLocalDb();
      const tx = db.transaction(["daily_records", "habits"], "readwrite");
      if (!(await tx.objectStore("habits").get(habitId))) throw new LocalStoreError("Habit not found.");
      const store = tx.objectStore("daily_records");
      const existing = await store.index("by_date_habit").get([date, habitId]);
      const ts = nowIso();
      await store.put(
        existing
          ? { ...existing, completed, updated_at: ts }
          : { id: newId(), habit_id: habitId, record_date: date, completed, created_at: ts, updated_at: ts },
      );
      await tx.done;
    }),

  ensureDontRecords: (date, habits) =>
    wrap("Could not prepare today's habits.", async () => {
      assertDate(date);
      const dont = habits.filter((h) => h.type === "dont");
      if (dont.length === 0) return;
      const db = await getLocalDb();
      const tx = db.transaction("daily_records", "readwrite");
      const idx = tx.store.index("by_date_habit");
      const ts = nowIso();
      for (const h of dont) {
        if (!(await idx.get([date, h.id]))) {
          await tx.store.add({ id: newId(), habit_id: h.id, record_date: date, completed: true, created_at: ts, updated_at: ts });
        }
      }
      await tx.done;
    }),

  getJournal: (date) =>
    wrap("Could not load journal.", async () => {
      assertDate(date);
      const db = await getLocalDb();
      const row = await db.getFromIndex("journal_entries", "by_date", date);
      return row?.content ?? "";
    }),

  listJournalDates: (startDate, endDate) =>
    wrap("Could not load journal.", async () => {
      assertDate(startDate);
      assertDate(endDate);
      const db = await getLocalDb();
      const rows = await db.getAllFromIndex("journal_entries", "by_date", IDBKeyRange.bound(startDate, endDate));
      return rows.filter((r) => r.content.trim().length > 0).map((r) => r.entry_date);
    }),

  saveJournal: (date, content) =>
    wrap("Could not save journal.", async () => {
      assertDate(date);
      if (content.length > LIMITS.journalContent) throw new LocalStoreError("Journal entry is too long.");
      const db = await getLocalDb();
      const tx = db.transaction("journal_entries", "readwrite");
      const existing = await tx.store.index("by_date").get(date);
      const ts = nowIso();
      await tx.store.put(
        existing
          ? { ...existing, content, updated_at: ts }
          : { id: newId(), entry_date: date, content, created_at: ts, updated_at: ts },
      );
      await tx.done;
    }),
};
