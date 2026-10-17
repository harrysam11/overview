import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { closeLocalDb } from "./localDb";
import { localHabitStore as store } from "@/lib/data/localHabitStore";
import { exportLocalData, parseBackup, replaceLocalData } from "./backup";
import { LIMITS, LOCAL_SCHEMA_VERSION } from "./schema";
import { calculateDayPoints } from "@/lib/habitScoring";
import { resolveAppMode } from "@/lib/appMode";

beforeEach(async () => {
  await closeLocalDb();
  globalThis.indexedDB = new IDBFactory();
});

describe("app mode", () => {
  it("defaults to local and only enables cloud when explicitly set", () => {
    expect(resolveAppMode(undefined)).toBe("local");
    expect(resolveAppMode("")).toBe("local");
    expect(resolveAppMode("supabase")).toBe("local");
    expect(resolveAppMode("cloud")).toBe("cloud");
  });
});

describe("scoring", () => {
  const habits = [{ id: "a", type: "do" as const }, { id: "b", type: "dont" as const }];
  it("do habit completed = 1, dont habit avoided = 1, journal = 2", () => {
    const recs = [
      { habit_id: "a", record_date: "2026-01-01", completed: true },
      { habit_id: "b", record_date: "2026-01-01", completed: false },
    ];
    expect(calculateDayPoints(habits, recs, true)).toBe(4);
  });
  it("dont habit with no record scores 0", () => {
    expect(calculateDayPoints(habits, [], false)).toBe(0);
  });
});

describe("local habit store", () => {
  it("adds, toggles, archives habits and saves journal", async () => {
    const h = await store.addHabit("Read", "do");
    expect(h.id).toBeTruthy();
    await store.setRecord("2026-01-02", h.id, true);
    await store.setRecord("2026-01-02", h.id, false); // upsert, not duplicate
    const recs = await store.listRecords("2026-01-01", "2026-01-31");
    expect(recs).toHaveLength(1);
    expect(recs[0].completed).toBe(false);
    await store.saveJournal("2026-01-02", "Good day");
    expect(await store.getJournal("2026-01-02")).toBe("Good day");
    expect(await store.listJournalDates("2026-01-01", "2026-01-31")).toEqual(["2026-01-02"]);
    await store.archiveHabit(h.id);
    expect(await store.listActiveHabits()).toHaveLength(0);
  });

  it("rejects invalid names, dates and unknown habits", async () => {
    await expect(store.addHabit("", "do")).rejects.toThrow();
    await expect(store.listRecords("01/01/2026", "2026-01-31")).rejects.toThrow("Invalid date");
    await expect(store.setRecord("2026-01-01", "missing", true)).rejects.toThrow("Habit not found");
  });

  it("creates dont records once per day", async () => {
    const h = await store.addHabit("No soda", "dont");
    await store.ensureDontRecords("2026-02-01", [h]);
    await store.ensureDontRecords("2026-02-01", [h]);
    expect(await store.listRecords("2026-02-01", "2026-02-01")).toHaveLength(1);
  });
});

describe("backup", () => {
  it("round-trips export → import", async () => {
    const h = await store.addHabit("Walk", "do");
    await store.setRecord("2026-03-01", h.id, true);
    await store.saveJournal("2026-03-01", "Notes");
    const text = JSON.stringify(await exportLocalData());
    await closeLocalDb();
    globalThis.indexedDB = new IDBFactory();
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) await replaceLocalData(parsed.backup);
    expect((await store.listActiveHabits()).map((x) => x.name)).toEqual(["Walk"]);
    expect(await store.getJournal("2026-03-01")).toBe("Notes");
  });

  const base = () => ({ app: "habitflow-lifeos", schema_version: LOCAL_SCHEMA_VERSION, exported_at: "x", data: { habits: [], daily_records: [], journal_entries: [] } });

  it("rejects wrong app, newer version, bad JSON and oversized files", () => {
    expect(parseBackup("{nope").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...base(), app: "other" })).ok).toBe(false);
    const newer = parseBackup(JSON.stringify({ ...base(), schema_version: LOCAL_SCHEMA_VERSION + 1 }));
    expect(newer.ok === false && newer.error).toContain("newer");
    expect(parseBackup("x".repeat(LIMITS.maxImportBytes + 1)).ok).toBe(false);
  });

  it("rejects records pointing at missing habits", () => {
    const b = base();
    (b.data.daily_records as unknown[]).push({ id: "r", habit_id: "ghost", record_date: "2026-01-01", completed: true, created_at: "t", updated_at: "t" });
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false);
  });
});
