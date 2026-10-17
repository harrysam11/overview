import { getLocalDb, LocalStoreError } from "./localDb";
import { BACKUP_APP_ID, backupSchema, LIMITS, LOCAL_SCHEMA_VERSION, type LocalBackup } from "./schema";

export type ParseResult = { ok: true; backup: LocalBackup } | { ok: false; error: string };

export const exportLocalData = async (): Promise<LocalBackup> => {
  const db = await getLocalDb();
  const tx = db.transaction(["habits", "daily_records", "journal_entries"], "readonly");
  const [habits, daily_records, journal_entries] = await Promise.all([
    tx.objectStore("habits").getAll(),
    tx.objectStore("daily_records").getAll(),
    tx.objectStore("journal_entries").getAll(),
  ]);
  await tx.done;
  return {
    app: BACKUP_APP_ID,
    schema_version: LOCAL_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    data: { habits, daily_records, journal_entries },
  };
};

const byteLength = (text: string) => new TextEncoder().encode(text).length;

/** Validates a backup file's text. Never touches stored data. */
export const parseBackup = (text: string): ParseResult => {
  if (byteLength(text) > LIMITS.maxImportBytes) return { ok: false, error: "File is larger than 10 MB." };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  const head = json as { app?: unknown; schema_version?: unknown };
  if (!head || typeof head !== "object" || head.app !== BACKUP_APP_ID) {
    return { ok: false, error: "This is not a HabitFlow LifeOS backup." };
  }
  if (typeof head.schema_version === "number" && head.schema_version > LOCAL_SCHEMA_VERSION) {
    return { ok: false, error: "This backup was made by a newer version of the app." };
  }
  if (head.schema_version !== LOCAL_SCHEMA_VERSION) return { ok: false, error: "Unsupported backup version." };

  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.errors[0];
    return { ok: false, error: `Backup is invalid at ${issue.path.join(".") || "root"}: ${issue.message}` };
  }
  const { habits, daily_records, journal_entries } = parsed.data.data;

  const habitIds = new Set<string>();
  for (const h of habits) {
    if (habitIds.has(h.id)) return { ok: false, error: "Backup contains duplicate habit IDs." };
    habitIds.add(h.id);
  }
  const recordIds = new Set<string>();
  const recordKeys = new Set<string>();
  for (const r of daily_records) {
    if (!habitIds.has(r.habit_id)) return { ok: false, error: "Backup has records for a habit that does not exist." };
    const key = `${r.record_date}|${r.habit_id}`;
    if (recordIds.has(r.id) || recordKeys.has(key)) return { ok: false, error: "Backup contains duplicate records." };
    recordIds.add(r.id);
    recordKeys.add(key);
  }
  const journalIds = new Set<string>();
  const journalDates = new Set<string>();
  for (const j of journal_entries) {
    if (journalIds.has(j.id) || journalDates.has(j.entry_date)) return { ok: false, error: "Backup contains duplicate journal entries." };
    journalIds.add(j.id);
    journalDates.add(j.entry_date);
  }
  return { ok: true, backup: parsed.data };
};

/** Replaces the local habits/records/journal subset in one transaction; on any failure nothing changes. */
export const replaceLocalData = async (backup: LocalBackup): Promise<void> => {
  const db = await getLocalDb();
  const tx = db.transaction(["habits", "daily_records", "journal_entries"], "readwrite");
  try {
    const habits = tx.objectStore("habits");
    const records = tx.objectStore("daily_records");
    const journal = tx.objectStore("journal_entries");
    await Promise.all([habits.clear(), records.clear(), journal.clear()]);
    for (const h of backup.data.habits) await habits.put(h);
    for (const r of backup.data.daily_records) await records.put(r);
    for (const j of backup.data.journal_entries) await journal.put(j);
    await tx.done;
  } catch (err) {
    try {
      tx.abort();
    } catch {
      /* already aborted */
    }
    throw new LocalStoreError("Import failed. Your existing data was not changed.", err);
  }
};

export const backupCounts = (b: LocalBackup) => ({
  habits: b.data.habits.length,
  records: b.data.daily_records.length,
  journal: b.data.journal_entries.length,
});
