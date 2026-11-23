import { z } from "zod";

/** Bump when the local IndexedDB layout or backup format changes; add an upgrade step in localDb.ts. */
export const LOCAL_SCHEMA_VERSION = 4;
export const BACKUP_SCHEMA_VERSION = 4;
export const LEGACY_BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_ID = "habitflow-lifeos";

export const LIMITS = {
  maxImportBytes: 15 * 1024 * 1024,
  maxHabits: 5_000,
  maxRecords: 500_000,
  maxJournalEntries: 50_000,
  habitName: 100,
  habitNotes: 2_000,
  journalContent: 5_000,
  taskTitle: 200,
  maxTasks: 50_000,
  maxProjects: 10_000,
  maxWeeklyPlans: 10_000,
  maxGoals: 1_000,
  maxMilestones: 10_000,
  maxDiaryEntries: 10_000,
  maxDiaryEntryHabits: 50_000,
  maxIdeaCategories: 1_000,
  maxIdeaCards: 10_000,
  maxScratchPadBytes: 100_000,
  maxBadges: 500,
  maxShortcuts: 500,
  maxChallenges: 500,
  maxChallengeParticipants: 2_000,
  maxNotes: 5_000,
  maxFinanceTransactions: 50_000,
  maxFinanceBudgets: 200,
  maxInvestmentAssets: 500,
  maxFiles: 500,
  maxNoteContentChars: 500_000,
  maxFileSizeBytes: 25 * 1024 * 1024,
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

export const localWeeklyPlanSchema = z.object({
  id,
  week_start: dateString,
  title: z.string().trim().min(1).max(LIMITS.taskTitle),
  priority: z.enum(["high", "medium", "low"]),
  is_completed: z.boolean(),
  sort_order: z.number().int(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const localMilestoneSchema = z.object({
  id,
  goal_id: id,
  title: z.string().trim().min(1).max(LIMITS.taskTitle),
  is_completed: z.boolean(),
  sort_order: z.number().int(),
  created_at: timestamp,
});

export const localGoalSchema = z.object({
  id,
  title: z.string().trim().min(1).max(LIMITS.taskTitle),
  description: z.string().max(2000).nullable(),
  target_date: z.string().max(40).nullable(),
  status: z.string().max(50),
  sort_order: z.number().int(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const localDiaryEntrySchema = z.object({
  id,
  entry_date: dateString,
  title: z.string().max(200).nullable(),
  content: z.unknown(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const localDiaryEntryHabitSchema = z.object({
  id,
  diary_entry_id: id,
  habit_id: id,
  created_at: timestamp,
});

export const localIdeaCategorySchema = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  color: z.string().max(50),
  sort_order: z.number().int(),
  created_at: timestamp,
});

export const localIdeaCardSchema = z.object({
  id,
  category_id: id,
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10000).nullable(),
  sort_order: z.number().int(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const localScratchPadSchema = z.object({
  content: z.string().max(LIMITS.maxScratchPadBytes),
  updated_at: timestamp.or(z.literal("")),
});

export const localUserBadgeSchema = z.object({
  id: id.default(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}`)),
  badge_id: id,
  earned_at: timestamp,
});

export const localUserLevelSchema = z.object({
  total_xp: z.number().int().nonnegative(),
  updated_at: timestamp.or(z.literal("")),
});

export const localSettingsSchema = z.object({
  username: z.string().max(30).nullable(),
  display_name: z.string().max(100).nullable(),
  updated_at: timestamp.or(z.literal("")),
});

export const localShortcutSchema = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  url: z.string().trim().min(1).max(2000),
  favicon_url: z.string().max(500).nullable(),
  sort_order: z.number().int(),
  created_at: timestamp,
});

export type LocalHabit = z.infer<typeof localHabitSchema>;
export type LocalDailyRecord = z.infer<typeof localDailyRecordSchema>;
export type LocalJournalEntry = z.infer<typeof localJournalEntrySchema>;
export type LocalTask = z.infer<typeof localTaskSchema>;
export type LocalProject = z.infer<typeof localProjectSchema>;
export type LocalWeeklyPlan = z.infer<typeof localWeeklyPlanSchema>;
export type LocalGoal = z.infer<typeof localGoalSchema>;
export type LocalMilestone = z.infer<typeof localMilestoneSchema>;
export type LocalDiaryEntry = z.infer<typeof localDiaryEntrySchema>;
export type LocalDiaryEntryHabit = z.infer<typeof localDiaryEntryHabitSchema>;
export type LocalIdeaCategory = z.infer<typeof localIdeaCategorySchema>;
export type LocalIdeaCard = z.infer<typeof localIdeaCardSchema>;
export type LocalScratchPad = z.infer<typeof localScratchPadSchema>;
export type LocalUserBadge = z.infer<typeof localUserBadgeSchema>;
export type LocalUserLevel = z.infer<typeof localUserLevelSchema>;
export type LocalSettings = z.infer<typeof localSettingsSchema>;
export type LocalShortcut = z.infer<typeof localShortcutSchema>;

export const localChallengeGoalTypeSchema = z.enum(["points", "streak_days", "habits_completed"]);
export type LocalChallengeGoalType = z.infer<typeof localChallengeGoalTypeSchema>;

export const localChallengeSchema = z.object({
  id: id,
  creator_id: id.default("local-user"),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).nullable().default(null),
  start_date: timestamp,
  end_date: timestamp,
  goal_type: localChallengeGoalTypeSchema,
  goal_value: z.number().int().min(1).max(1_000_000),
  is_public: z.boolean().default(false),
  created_at: timestamp,
});
export type LocalChallenge = z.infer<typeof localChallengeSchema>;

export const localChallengeParticipantSchema = z.object({
  id: id,
  challenge_id: id,
  user_id: id.default("local-user"),
  progress: z.number().min(0).max(1_000_000).default(0),
  joined_at: timestamp,
  profile_name: z.string().max(100).nullable().default(null),
});
export type LocalChallengeParticipant = z.infer<typeof localChallengeParticipantSchema>;

export const localNoteDocumentSchema = z.object({
  id: id,
  title: z.string().trim().min(1).max(200),
  content: z.string().max(LIMITS.maxNoteContentChars).default(""),
  folder: z.string().trim().max(100).default("General"),
  tags: z.array(z.string().trim().max(50)).default([]),
  is_pinned: z.boolean().default(false),
  is_archived: z.boolean().default(false),
  created_at: timestamp,
  updated_at: timestamp,
});
export type LocalNoteDocument = z.infer<typeof localNoteDocumentSchema>;

export const localFinanceTransactionSchema = z.object({
  id: id,
  date: dateString,
  amount: z.number().finite().positive().max(1_000_000_000),
  type: z.enum(["expense", "income"]),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).nullable().default(null),
  created_at: timestamp,
});
export type LocalFinanceTransaction = z.infer<typeof localFinanceTransactionSchema>;

export const localFinanceBudgetSchema = z.object({
  id: id,
  category: z.string().trim().min(1).max(80),
  monthly_limit: z.number().finite().positive().max(1_000_000_000),
  created_at: timestamp,
  updated_at: timestamp,
});
export type LocalFinanceBudget = z.infer<typeof localFinanceBudgetSchema>;

export const localInvestmentAssetSchema = z.object({
  id: id,
  name: z.string().trim().min(1).max(100),
  symbol: z.string().trim().max(20).default(""),
  asset_class: z.enum(["stocks", "crypto", "etf", "cash", "real_estate", "metals", "other"]),
  units: z.number().finite().nonnegative().max(1_000_000_000),
  buy_price: z.number().finite().nonnegative().max(1_000_000_000),
  current_price: z.number().finite().nonnegative().max(1_000_000_000),
  target_allocation_pct: z.number().finite().min(0).max(100).default(0),
  notes: z.string().max(1000).nullable().default(null),
  updated_at: timestamp,
});
export type LocalInvestmentAsset = z.infer<typeof localInvestmentAssetSchema>;

export const localStoredFileSchema = z.object({
  id: id,
  name: z.string().trim().min(1).max(255),
  size: z.number().int().nonnegative().max(LIMITS.maxFileSizeBytes),
  type: z.string().max(100).default("text/plain"),
  data_base64: z.string().max(10_000_000),
  created_at: timestamp,
});
export type LocalStoredFile = z.infer<typeof localStoredFileSchema>;

export const localAiSettingsSchema = z.object({
  endpoint: z.string().default("http://127.0.0.1:11434"),
  model: z.string().min(1).max(100).default("llama3"),
  is_enabled: z.boolean().default(true),
  system_prompt: z.string().max(2000).default("You are an offline personal habit coach in HabitFlow LifeOS."),
});
export type LocalAiSettings = z.infer<typeof localAiSettingsSchema>;

export const localNotificationSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  morning_time: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  evening_time: z.string().regex(/^\d{2}:\d{2}$/).default("21:00"),
  last_notified_date: z.string().default(""),
});
export type LocalNotificationSettings = z.infer<typeof localNotificationSettingsSchema>;

export const localVaultDataSchema = z.object({
  habits: z.array(localHabitSchema).max(LIMITS.maxHabits),
  daily_records: z.array(localDailyRecordSchema).max(LIMITS.maxRecords),
  journal_entries: z.array(localJournalEntrySchema).max(LIMITS.maxJournalEntries),
  tasks: z.array(localTaskSchema).max(LIMITS.maxTasks).default([]),
  projects: z.array(localProjectSchema).max(LIMITS.maxProjects).default([]),
  weekly_plans: z.array(localWeeklyPlanSchema).max(LIMITS.maxWeeklyPlans).default([]),
  goals: z.array(localGoalSchema).max(LIMITS.maxGoals).default([]),
  milestones: z.array(localMilestoneSchema).max(LIMITS.maxMilestones).default([]),
  diary_entries: z.array(localDiaryEntrySchema).max(LIMITS.maxDiaryEntries).default([]),
  diary_entry_habits: z.array(localDiaryEntryHabitSchema).max(LIMITS.maxDiaryEntryHabits).default([]),
  idea_categories: z.array(localIdeaCategorySchema).max(LIMITS.maxIdeaCategories).default([]),
  idea_cards: z.array(localIdeaCardSchema).max(LIMITS.maxIdeaCards).default([]),
  scratch_pad: localScratchPadSchema.default({ content: "", updated_at: "" }),
  user_badges: z.array(localUserBadgeSchema).max(LIMITS.maxBadges).default([]),
  user_level: localUserLevelSchema.default({ total_xp: 0, updated_at: "" }),
  settings: localSettingsSchema.default({ username: null, display_name: null, updated_at: "" }),
  shortcuts: z.array(localShortcutSchema).max(LIMITS.maxShortcuts).default([]),
  challenges: z.array(localChallengeSchema).max(LIMITS.maxChallenges).default([]),
  challenge_participants: z.array(localChallengeParticipantSchema).max(LIMITS.maxChallengeParticipants).default([]),
  notes: z.array(localNoteDocumentSchema).max(LIMITS.maxNotes).default([]),
  finance_transactions: z.array(localFinanceTransactionSchema).max(LIMITS.maxFinanceTransactions).default([]),
  finance_budgets: z.array(localFinanceBudgetSchema).max(LIMITS.maxFinanceBudgets).default([]),
  investment_assets: z.array(localInvestmentAssetSchema).max(LIMITS.maxInvestmentAssets).default([]),
  stored_files: z.array(localStoredFileSchema).max(LIMITS.maxFiles).default([]),
  ai_settings: localAiSettingsSchema.default({
    endpoint: "http://127.0.0.1:11434",
    model: "llama3",
    is_enabled: true,
    system_prompt: "You are an offline personal habit coach in HabitFlow LifeOS.",
  }),
  notification_settings: localNotificationSettingsSchema.default({
    enabled: false,
    morning_time: "08:00",
    evening_time: "21:00",
    last_notified_date: "",
  }),
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

export const backupSchemaV4 = z.object({
  app: z.literal(BACKUP_APP_ID),
  schema_version: z.literal(4),
  exported_at: z.string(),
  data: localVaultDataSchema,
});

export const backupSchemaV3 = z.object({
  app: z.literal(BACKUP_APP_ID),
  schema_version: z.literal(3),
  exported_at: z.string(),
  data: z.any(),
});

export const backupSchemaV2 = z.object({
  app: z.literal(BACKUP_APP_ID),
  schema_version: z.literal(2),
  exported_at: z.string(),
  data: z.object({
    habits: z.array(localHabitSchema).max(LIMITS.maxHabits),
    daily_records: z.array(localDailyRecordSchema).max(LIMITS.maxRecords),
    journal_entries: z.array(localJournalEntrySchema).max(LIMITS.maxJournalEntries),
    tasks: z.array(localTaskSchema).max(LIMITS.maxTasks).default([]),
    projects: z.array(localProjectSchema).max(LIMITS.maxProjects).default([]),
  }),
});

export const legacyBackupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schema_version: z.literal(1),
  exported_at: z.string(),
  data: z.object({
    habits: z.array(localHabitSchema).max(LIMITS.maxHabits),
    daily_records: z.array(localDailyRecordSchema).max(LIMITS.maxRecords),
    journal_entries: z.array(localJournalEntrySchema).max(LIMITS.maxJournalEntries),
    tasks: z.array(localTaskSchema).max(LIMITS.maxTasks).default([]),
    projects: z.array(localProjectSchema).max(LIMITS.maxProjects).default([]),
  }),
});

export const backupSchema = backupSchemaV4;
export type LocalBackup = z.infer<typeof backupSchemaV4>;
export const isDateString = (v: string) => dateString.safeParse(v).success;
