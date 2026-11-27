import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { calculateDayPoints } from "@/lib/habitScoring";
import { localHabitStore as store } from "@/lib/data/localHabitStore";
import { resolveAppMode } from "@/lib/appMode";
import { exportLocalData, parseBackup, replaceLocalData } from "./backup";
import { closeLocalDb, getLocalDb, newId, nowIso } from "./localDb";
import { BACKUP_SCHEMA_VERSION, LIMITS } from "./schema";
import { decryptBackupWithPassphrase, exportEncryptedBackup, hasEncryptedVault, lockLocalVault, readVaultData, unlockLocalVault, updateVaultData } from "./vault";

const PASSPHRASE = "HabitFlow local test passphrase";

beforeEach(async () => {
  await closeLocalDb();
  lockLocalVault();
  globalThis.indexedDB = new IDBFactory();
});

const unlock = () => unlockLocalVault(PASSPHRASE);

describe("app mode", () => {
  it("keeps legacy table-backed cloud mode disabled", () => {
    expect(resolveAppMode(undefined)).toBe("local");
    expect(resolveAppMode("")).toBe("local");
    expect(resolveAppMode("supabase")).toBe("local");
    expect(resolveAppMode("cloud")).toBe("local");
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

describe("encrypted local habit store", () => {
  it("adds, updates, archives habits and saves journal entries in the vault", async () => {
    await unlock();
    const habit = await store.addHabit("Read", "do");
    await store.setRecord("2026-01-02", habit.id, true);
    await store.setRecord("2026-01-02", habit.id, false);
    const records = await store.listRecords("2026-01-01", "2026-01-31");
    expect(records).toHaveLength(1);
    expect(records[0].completed).toBe(false);
    await store.saveJournal("2026-01-02", "Good day");
    expect(await store.getJournal("2026-01-02")).toBe("Good day");
    expect(await store.listJournalDates("2026-01-01", "2026-01-31")).toEqual(["2026-01-02"]);
    await store.archiveHabit(habit.id);
    expect(await store.listActiveHabits()).toHaveLength(0);
  });

  it("rejects invalid names, dates and unknown habits", async () => {
    await unlock();
    await expect(store.addHabit("", "do")).rejects.toThrow();
    await expect(store.listRecords("01/01/2026", "2026-01-31")).rejects.toThrow("Invalid date");
    await expect(store.setRecord("2026-01-01", "missing", true)).rejects.toThrow("Habit not found");
  });

  it("creates don't-habit records only once per day", async () => {
    await unlock();
    const habit = await store.addHabit("No soda", "dont");
    await store.ensureDontRecords("2026-02-01", [habit]);
    await store.ensureDontRecords("2026-02-01", [habit]);
    expect(await store.listRecords("2026-02-01", "2026-02-01")).toHaveLength(1);
  });
});

describe("passphrase vault", () => {
  it("encrypts legacy records and removes their plaintext copies after migration", async () => {
    const stamp = nowIso();
    const db = await getLocalDb();
    await db.add("habits", { id: "legacy-habit", name: "Private habit", type: "do", is_active: true, notes: null, created_at: stamp, updated_at: stamp });
    await db.add("daily_records", { id: "legacy-record", habit_id: "legacy-habit", record_date: "2026-01-01", completed: true, created_at: stamp, updated_at: stamp });
    await db.add("journal_entries", { id: "legacy-journal", entry_date: "2026-01-01", content: "Private journal", created_at: stamp, updated_at: stamp });
    const storage = new Map<string, string>([
      ["habitflow-lifeos-tasks", JSON.stringify([{ id: "old-task", title: "Private task", done: false }])],
      ["habitflow-lifeos-projects", JSON.stringify([{ id: "old-project", title: "Private project", area: "Home" }])],
    ]);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
      },
    });

    await unlock();
    const saved = await readVaultData();
    expect(saved.habits[0]?.name).toBe("Private habit");
    expect(saved.tasks[0]?.title).toBe("Private task");
    expect(saved.projects[0]?.title).toBe("Private project");
    expect(await db.count("habits")).toBe(0);
    expect(await db.count("daily_records")).toBe(0);
    expect(await db.count("journal_entries")).toBe(0);
    expect(storage.size).toBe(0);
    const cipher = await db.get("vault", "primary");
    expect(JSON.stringify(cipher)).not.toContain("Private habit");
    expect(JSON.stringify(cipher)).not.toContain("Private journal");
  });

  it("requires the correct passphrase and does not keep a key after locking", async () => {
    await unlock();
    await store.addHabit("Private habit", "do");
    lockLocalVault();
    await expect(readVaultData()).rejects.toThrow("Unlock your local data");
    await expect(unlockLocalVault("wrong passphrase here")).rejects.toThrow("Passphrase is incorrect");
    await unlockLocalVault(PASSPHRASE);
    expect((await readVaultData()).habits[0]?.name).toBe("Private habit");
  });

  it("preserves plaintext records if legacy data fails validation", async () => {
    const db = await getLocalDb();
    await db.add("habits", { id: "bad-habit", name: "", type: "do", is_active: true, notes: null, created_at: nowIso(), updated_at: nowIso() });
    await expect(unlock()).rejects.toThrow("needs repair");
    expect(await db.count("habits")).toBe(1);
    expect(await hasEncryptedVault()).toBe(false);
  });

  it("uses encrypted backups for habits, journal, tasks and projects", async () => {
    await unlock();
    const habit = await store.addHabit("Private habit", "do");
    await store.saveJournal("2026-03-01", "Private journal");
    await updateVaultData((data) => ({
      ...data,
      tasks: [{ id: newId(), title: "Private task", done: false }],
      projects: [{ id: newId(), title: "Private project", area: "Home" }],
    }));
    const backup = await exportEncryptedBackup(await exportLocalData());
    expect(backup).not.toContain("Private habit");
    expect(backup).not.toContain("Private journal");
    expect(backup).not.toContain("Private task");
    await expect(decryptBackupWithPassphrase(backup, "wrong passphrase here")).rejects.toThrow("Passphrase is incorrect");
    const restored = await decryptBackupWithPassphrase(backup, PASSPHRASE);
    expect(restored.data.habits.map((item) => item.name)).toEqual(["Private habit"]);
    expect(restored.data.tasks[0]?.title).toBe("Private task");
    expect(restored.data.projects[0]?.title).toBe("Private project");

    await replaceLocalData({ ...restored, data: { ...restored.data, habits: [{ ...restored.data.habits[0], name: "Restored" }] } });
    expect((await readVaultData()).habits[0]?.name).toBe("Restored");
  });

  it("rejects too-short passphrases", async () => {
    await expect(unlockLocalVault("short")).rejects.toThrow("12 and 1,024");
  });
});

describe("backup validation", () => {
  const base = () => ({
    app: "habitflow-lifeos" as const,
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: "2026-01-01T00:00:00.000Z",
    data: { habits: [], daily_records: [], journal_entries: [], tasks: [], projects: [] },
  });

  it("round-trips an export, validates references and replaces data", async () => {
    await unlock();
    const habit = await store.addHabit("Walk", "do");
    await store.setRecord("2026-03-01", habit.id, true);
    await store.saveJournal("2026-03-01", "Notes");
    const parsed = parseBackup(JSON.stringify(await exportLocalData()));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) await replaceLocalData(parsed.backup);
    expect((await store.listActiveHabits()).map((item) => item.name)).toEqual(["Walk"]);
    expect(await store.getJournal("2026-03-01")).toBe("Notes");
  });

  it("rejects invalid JSON, oversized files and unsupported backup versions", () => {
    expect(parseBackup("{nope").ok).toBe(false);
    expect(parseBackup("x".repeat(LIMITS.maxImportBytes + 1)).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...base(), schema_version: BACKUP_SCHEMA_VERSION + 1 })).ok).toBe(false);
  });

  it("rejects daily records that reference missing habits", () => {
    const backup = base();
    backup.data.daily_records.push({ id: "record", habit_id: "ghost", record_date: "2026-01-01", completed: true, created_at: "t", updated_at: "t" });
    expect(parseBackup(JSON.stringify(backup)).ok).toBe(false);
  });

  it("validates and upgrades older plaintext backups for encrypted import", () => {
    const legacy = {
      app: "habitflow-lifeos",
      schema_version: 1,
      exported_at: "2026-01-01T00:00:00.000Z",
      data: { habits: [], daily_records: [], journal_entries: [] },
    };
    const result = parseBackup(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.schema_version).toBe(BACKUP_SCHEMA_VERSION);
      expect(result.backup.data.tasks).toEqual([]);
      expect(result.backup.data.projects).toEqual([]);
    }
  });
});