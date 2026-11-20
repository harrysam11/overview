import { z } from "zod";

/** Bump when the local IndexedDB layout or backup format changes; add an upgrade step in localDb.ts. */
export const LOCAL_SCHEMA_VERSION = 2;
export const BACKUP_SCHEMA_VERSION = 2;
export const BACKUP_APP_ID = "habitflow-lifeos";

export const LIMITS = {
  maxImportBytes: 10 * 1024 * 1024,
  maxHabits: 5_000,
  maxRecords: 500_000,
  maxJournalEntries: 50_000,
  habitName: 100,
  habitNotes: 2_000,
  journalContent: 5_000,
  taskTitle: 200,
  maxTasks: 50_000,
  maxProjects: 10_000,
} as const;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (expected YYYY-MM-DD)");
const id = z.string().min(1).max(100);
const timestamp = z.string().min(1).max(40);

export const localHabitSchema = z.object({
  id,
  name: z.string().trim().min(1).max(LIMITS.habitName),
  type: z.enum(["do", "dont"]),
  is_active: z.boolean(),
  notes: z.string().max(LIMITS.habitNotes).nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const localDailyRecordSchema = z.object({
  id,
  habit_id: id,
  record_date: dateString,
  completed: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const localJournalEntrySchema = z.object({
  id,
  entry_date: dateString,
  content: z.string().max(LIMITS.journalContent),
  created_at: timestamp,
  updated_at: timestamp,
});

export const localTaskSchema = z.object({
  id,
  title: z.string().trim().min(1).max(LIMITS.taskTitle),
  done: z.boolean(),
});

export const localProjectSchema = z.object({
  id,
  title: z.string().trim().min(1).max(LIMITS.taskTitle),
  area: z.string().trim().min(1).max(100),
});

export type LocalHabit = z.infer<typeof localHabitSchema>;
export type LocalDailyRecord = z.infer<typeof localDailyRecordSchema>;
export type LocalJournalEntry = z.infer<typeof localJournalEntrySchema>;
export type LocalTask = z.infer<typeof localTaskSchema>;
export type LocalProject = z.infer<typeof localProjectSchema>;

export const localVaultDataSchema = z.object({
  habits: z.array(localHabitSchema).max(LIMITS.maxHabits),
  daily_records: z.array(localDailyRecordSchema).max(LIMITS.maxRecords),
  journal_entries: z.array(localJournalEntrySchema).max(LIMITS.maxJournalEntries),
  tasks: z.array(localTaskSchema).max(LIMITS.maxTasks),
  projects: z.array(localProjectSchema).max(LIMITS.maxProjects),
});

export type LocalVaultData = z.infer<typeof localVaultDataSchema>;

export const encryptedPayloadSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().nonnegative().optional(),
  kdf: z.literal("PBKDF2-SHA256"),
  iterations: z.number().int().min(310_000).max(1_000_000),
  salt: z.string().min(20).max(64),
  iv: z.string().min(12).max(32),
  ciphertext: z.string().min(16).max(30_000_000),
});

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schema_version: z.literal(BACKUP_SCHEMA_VERSION),
  exported_at: z.string(),
  data: z.object({
    habits: z.array(localHabitSchema).max(LIMITS.maxHabits),
    daily_records: z.array(localDailyRecordSchema).max(LIMITS.maxRecords),
    journal_entries: z.array(localJournalEntrySchema).max(LIMITS.maxJournalEntries),
    tasks: z.array(localTaskSchema).max(LIMITS.maxTasks),
    projects: z.array(localProjectSchema).max(LIMITS.maxProjects),
  }),
});

export type LocalBackup = z.infer<typeof backupSchema>;
export const isDateString = (v: string) => dateString.safeParse(v).success;
