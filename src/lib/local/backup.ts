import { LocalStoreError } from "./localDb";
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  backupSchema,
  legacyBackupSchema,
  LIMITS,
  type LocalBackup,
} from "./schema";
import { readVaultData, updateVaultData } from "./vault";

export type ParseResult = { ok: true; backup: LocalBackup } | { ok: false; error: string };

export const exportLocalData = async (): Promise<LocalBackup> => ({
  app: BACKUP_APP_ID,
  schema_version: BACKUP_SCHEMA_VERSION,
  exported_at: new Date().toISOString(),
  data: await readVaultData(),
});

const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;

export const parseBackup = (text: string): ParseResult => {
  if (byteLength(text) > LIMITS.maxImportBytes) return { ok: false, error: "File is larger than 10 MB." };
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  const parsed = backupSchema.safeParse(json);
  if (parsed.success) return validateBackup(parsed.data);

  const legacy = legacyBackupSchema.safeParse(json);
  if (legacy.success) {
    return validateBackup({
      ...legacy.data,
      schema_version: BACKUP_SCHEMA_VERSION,
      data: { ...legacy.data.data, tasks: legacy.data.data.tasks, projects: legacy.data.data.projects },
    });
  }

  const issue = legacy.error.issues[0] ?? parsed.error.issues[0];
  return { ok: false, error: `Backup is invalid at ${issue.path.join(".") || "root"}: ${issue.message}` };
};

export const validateBackup = (backup: LocalBackup): ParseResult => {
  const { habits, daily_records, journal_entries, tasks, projects } = backup.data;
  const habitIds = new Set<string>();
  for (const habit of habits) {
    if (habitIds.has(habit.id)) return { ok: false, error: "Backup contains duplicate habit IDs." };
    habitIds.add(habit.id);
  }
  const recordIds = new Set<string>();
  const recordKeys = new Set<string>();
  for (const record of daily_records) {
    const key = `${record.record_date}|${record.habit_id}`;
    if (!habitIds.has(record.habit_id)) return { ok: false, error: "Backup has records for a habit that does not exist." };
    if (recordIds.has(record.id) || recordKeys.has(key)) return { ok: false, error: "Backup contains duplicate records." };
    recordIds.add(record.id);
    recordKeys.add(key);
  }
  const journalIds = new Set<string>();
  const journalDates = new Set<string>();
  for (const entry of journal_entries) {
    if (journalIds.has(entry.id) || journalDates.has(entry.entry_date)) return { ok: false, error: "Backup contains duplicate journal entries." };
    journalIds.add(entry.id);
    journalDates.add(entry.entry_date);
  }
  const taskIds = new Set<string>();
  for (const task of tasks) {
    if (taskIds.has(task.id)) return { ok: false, error: "Backup contains duplicate task IDs." };
    taskIds.add(task.id);
  }
  const projectIds = new Set<string>();
  for (const project of projects) {
    if (projectIds.has(project.id)) return { ok: false, error: "Backup contains duplicate project IDs." };
    projectIds.add(project.id);
  }
  return { ok: true, backup };
};

export const replaceLocalData = async (backup: LocalBackup): Promise<void> => {
  const validated = validateBackup(backup);
  if (!validated.ok) throw new LocalStoreError(validated.error);
  await updateVaultData(() => backup.data);
};

export const backupCounts = (backup: LocalBackup) => ({
  habits: backup.data.habits.length,
  records: backup.data.daily_records.length,
  journal: backup.data.journal_entries.length,
  tasks: backup.data.tasks.length,
  projects: backup.data.projects.length,
});