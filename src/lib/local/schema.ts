import { z } from "zod";

/** Bump when the local IndexedDB layout or backup format changes; add an upgrade step in localDb.ts. */
export const LOCAL_SCHEMA_VERSION = 1;
export const BACKUP_APP_ID = "habitflow-lifeos";

export const LIMITS = {
  maxImportBytes: 10 * 1024 * 1024,
  maxHabits: 5_000,
  maxRecords: 500_000,
  maxJournalEntries: 50_000,
  habitName: 100,
  habitNotes: 2_000,
  journalContent: 5_000,
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

export type LocalHabit = z.infer<typeof localHabitSchema>;
export type LocalDailyRecord = z.infer<typeof localDailyRecordSchema>;
export type LocalJournalEntry = z.infer<typeof localJournalEntrySchema>;

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schema_version: z.number().int().positive(),
  exported_at: z.string(),
  data: z.object({
    habits: z.array(localHabitSchema).max(LIMITS.maxHabits),
    daily_records: z.array(localDailyRecordSchema).max(LIMITS.maxRecords),
    journal_entries: z.array(localJournalEntrySchema).max(LIMITS.maxJournalEntries),
  }),
});

export type LocalBackup = z.infer<typeof backupSchema>;
export const isDateString = (v: string) => dateString.safeParse(v).success;
