import { LocalStoreError } from "./localDb";
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  backupSchemaV4,
  backupSchemaV3,
  backupSchemaV2,
  legacyBackupSchema,
  localVaultDataSchema,
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
  if (byteLength(text) > LIMITS.maxImportBytes) return { ok: false, error: "File is larger than limit." };
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  const v4 = backupSchemaV4.safeParse(json);
  if (v4.success) return validateBackup(v4.data);

  const v3 = backupSchemaV3.safeParse(json);
  if (v3.success) {
    const upgraded = localVaultDataSchema.parse(v3.data.data);
    return validateBackup({
      app: BACKUP_APP_ID,
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: v3.data.exported_at,
      data: upgraded,
    });
  }

  const v2 = backupSchemaV2.safeParse(json);
  if (v2.success) {
    const upgraded = localVaultDataSchema.parse(v2.data.data);
    return validateBackup({
      app: BACKUP_APP_ID,
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: v2.data.exported_at,
      data: upgraded,
    });
  }

  const legacy = legacyBackupSchema.safeParse(json);
  if (legacy.success) {
    const upgraded = localVaultDataSchema.parse(legacy.data.data);
    return validateBackup({
      app: BACKUP_APP_ID,
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: legacy.data.exported_at,
      data: upgraded,
    });
  }

  const issue = v4.error.issues[0] ?? v3.error.issues[0] ?? v2.error.issues[0] ?? legacy.error.issues[0];
  return { ok: false, error: `Backup is invalid at ${issue.path.join(".") || "root"}: ${issue.message}` };
};

export const validateBackup = (backup: LocalBackup): ParseResult => {
  const {
    habits,
    daily_records,
    journal_entries,
    tasks,
    projects,
    weekly_plans,
    goals,
    milestones,
    diary_entries,
    diary_entry_habits,
    idea_categories,
    idea_cards,
    user_badges,
    shortcuts,
  } = backup.data;

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

  const planIds = new Set<string>();
  for (const plan of weekly_plans || []) {
    if (planIds.has(plan.id)) return { ok: false, error: "Backup contains duplicate weekly plan IDs." };
    planIds.add(plan.id);
  }

  const goalIds = new Set<string>();
  for (const goal of goals || []) {
    if (goalIds.has(goal.id)) return { ok: false, error: "Backup contains duplicate goal IDs." };
    goalIds.add(goal.id);
  }

  const milestoneIds = new Set<string>();
  for (const milestone of milestones || []) {
    if (!goalIds.has(milestone.goal_id)) return { ok: false, error: "Backup has milestone for a goal that does not exist." };
    if (milestoneIds.has(milestone.id)) return { ok: false, error: "Backup contains duplicate milestone IDs." };
    milestoneIds.add(milestone.id);
  }

  const diaryEntryIds = new Set<string>();
  for (const entry of diary_entries || []) {
    if (diaryEntryIds.has(entry.id)) return { ok: false, error: "Backup contains duplicate diary entry IDs." };
    diaryEntryIds.add(entry.id);
  }

  const diaryTagIds = new Set<string>();
  for (const tag of diary_entry_habits || []) {
    if (!diaryEntryIds.has(tag.diary_entry_id)) return { ok: false, error: "Backup has habit tag for a diary entry that does not exist." };
    if (!habitIds.has(tag.habit_id)) return { ok: false, error: "Backup has diary tag for a habit that does not exist." };
    if (diaryTagIds.has(tag.id)) return { ok: false, error: "Backup contains duplicate diary tag IDs." };
    diaryTagIds.add(tag.id);
  }

  const categoryIds = new Set<string>();
  for (const cat of idea_categories || []) {
    if (categoryIds.has(cat.id)) return { ok: false, error: "Backup contains duplicate idea category IDs." };
    categoryIds.add(cat.id);
  }

  const cardIds = new Set<string>();
  for (const card of idea_cards || []) {
    if (!categoryIds.has(card.category_id)) return { ok: false, error: "Backup has idea card for a category that does not exist." };
    if (cardIds.has(card.id)) return { ok: false, error: "Backup contains duplicate idea card IDs." };
    cardIds.add(card.id);
  }

  const badgeIds = new Set<string>();
  for (const b of user_badges || []) {
    if (badgeIds.has(b.badge_id)) return { ok: false, error: "Backup contains duplicate user badges." };
    badgeIds.add(b.badge_id);
  }

  const shortcutIds = new Set<string>();
  for (const s of shortcuts || []) {
    if (shortcutIds.has(s.id)) return { ok: false, error: "Backup contains duplicate shortcut IDs." };
    shortcutIds.add(s.id);
  }

  const challengeIds = new Set<string>();
  for (const c of backup.data.challenges || []) {
    if (challengeIds.has(c.id)) return { ok: false, error: "Backup contains duplicate challenge IDs." };
    challengeIds.add(c.id);
  }

  const participantIds = new Set<string>();
  for (const p of backup.data.challenge_participants || []) {
    if (!challengeIds.has(p.challenge_id)) return { ok: false, error: "Backup has participant for a challenge that does not exist." };
    if (participantIds.has(p.id)) return { ok: false, error: "Backup contains duplicate challenge participant IDs." };
    participantIds.add(p.id);
  }

  const noteIds = new Set<string>();
  for (const n of backup.data.notes || []) {
    if (noteIds.has(n.id)) return { ok: false, error: "Backup contains duplicate note IDs." };
    noteIds.add(n.id);
  }

  const txIds = new Set<string>();
  for (const t of backup.data.finance_transactions || []) {
    if (txIds.has(t.id)) return { ok: false, error: "Backup contains duplicate finance transaction IDs." };
    txIds.add(t.id);
  }

  const budgetCategories = new Set<string>();
  for (const b of backup.data.finance_budgets || []) {
    if (budgetCategories.has(b.category)) return { ok: false, error: "Backup contains duplicate budget category." };
    budgetCategories.add(b.category);
  }

  const assetIds = new Set<string>();
  for (const a of backup.data.investment_assets || []) {
    if (assetIds.has(a.id)) return { ok: false, error: "Backup contains duplicate investment asset IDs." };
    assetIds.add(a.id);
  }

  const fileIds = new Set<string>();
  for (const f of backup.data.stored_files || []) {
    if (fileIds.has(f.id)) return { ok: false, error: "Backup contains duplicate file IDs." };
    fileIds.add(f.id);
  }

  return { ok: true, backup };
};

export const replaceLocalData = async (backup: LocalBackup): Promise<void> => {
  const validated = validateBackup(backup);
  if (validated.ok === false) throw new LocalStoreError(validated.error);
  await updateVaultData(() => backup.data);
};

export const mergeLocalData = async (incomingBackup: LocalBackup): Promise<LocalBackup> => {
  const validated = validateBackup(incomingBackup);
  if (validated.ok === false) throw new LocalStoreError(validated.error);

  const incoming = incomingBackup.data;

  const merged = await updateVaultData((current) => {
    // 1. Habits
    const habitMap = new Map<string, (typeof current.habits)[0]>();
    for (const h of current.habits) habitMap.set(h.id, h);
    for (const h of incoming.habits) {
      const existing = habitMap.get(h.id);
      if (!existing || h.updated_at > existing.updated_at) {
        habitMap.set(h.id, h);
      }
    }
    const mergedHabits = Array.from(habitMap.values());
    const validHabitIds = new Set(mergedHabits.map((h) => h.id));

    // 2. Daily records
    const recordMap = new Map<string, (typeof current.daily_records)[0]>();
    for (const r of current.daily_records) {
      if (validHabitIds.has(r.habit_id)) {
        recordMap.set(`${r.record_date}|${r.habit_id}`, r);
      }
    }
    for (const r of incoming.daily_records) {
      if (!validHabitIds.has(r.habit_id)) continue;
      const key = `${r.record_date}|${r.habit_id}`;
      const existing = recordMap.get(key);
      if (!existing) {
        recordMap.set(key, r);
      } else {
        const completed = existing.completed || r.completed;
        const newer = r.updated_at > existing.updated_at ? r : existing;
        recordMap.set(key, { ...newer, completed });
      }
    }
    const mergedRecords = Array.from(recordMap.values());

    // 3. Journal entries
    const journalMap = new Map<string, (typeof current.journal_entries)[0]>();
    for (const j of current.journal_entries) journalMap.set(j.entry_date, j);
    for (const j of incoming.journal_entries) {
      const existing = journalMap.get(j.entry_date);
      if (!existing || j.updated_at > existing.updated_at) {
        journalMap.set(j.entry_date, j);
      }
    }
    const mergedJournal = Array.from(journalMap.values());

    // 4. Tasks
    const taskMap = new Map<string, (typeof current.tasks)[0]>();
    for (const t of current.tasks) taskMap.set(t.id, t);
    for (const t of incoming.tasks) {
      const existing = taskMap.get(t.id);
      if (!existing) {
        taskMap.set(t.id, t);
      } else {
        taskMap.set(t.id, { ...existing, ...t, done: existing.done || t.done });
      }
    }
    const mergedTasks = Array.from(taskMap.values());

    // 5. Projects
    const projectMap = new Map<string, (typeof current.projects)[0]>();
    for (const p of current.projects) projectMap.set(p.id, p);
    for (const p of incoming.projects) {
      if (!projectMap.has(p.id)) projectMap.set(p.id, p);
    }
    const mergedProjects = Array.from(projectMap.values());

    // 6. Weekly plans
    const planMap = new Map<string, NonNullable<typeof current.weekly_plans>[0]>();
    for (const p of current.weekly_plans || []) planMap.set(p.id, p);
    for (const p of incoming.weekly_plans || []) {
      const existing = planMap.get(p.id);
      if (!existing || p.updated_at > existing.updated_at) planMap.set(p.id, p);
    }
    const mergedPlans = Array.from(planMap.values());

    // 7. Goals
    const goalMap = new Map<string, NonNullable<typeof current.goals>[0]>();
    for (const g of current.goals || []) goalMap.set(g.id, g);
    for (const g of incoming.goals || []) {
      const existing = goalMap.get(g.id);
      if (!existing || g.updated_at > existing.updated_at) goalMap.set(g.id, g);
    }
    const mergedGoals = Array.from(goalMap.values());
    const validGoalIds = new Set(mergedGoals.map((g) => g.id));

    // 8. Milestones
    const milestoneMap = new Map<string, NonNullable<typeof current.milestones>[0]>();
    for (const m of current.milestones || []) {
      if (validGoalIds.has(m.goal_id)) milestoneMap.set(m.id, m);
    }
    for (const m of incoming.milestones || []) {
      if (!validGoalIds.has(m.goal_id)) continue;
      const existing = milestoneMap.get(m.id);
      if (!existing || m.is_completed || m.updated_at > existing.updated_at) {
        milestoneMap.set(m.id, { ...existing, ...m, is_completed: existing?.is_completed || m.is_completed });
      }
    }
    const mergedMilestones = Array.from(milestoneMap.values());

    // 9. Diary entries
    const diaryMap = new Map<string, NonNullable<typeof current.diary_entries>[0]>();
    for (const d of current.diary_entries || []) diaryMap.set(d.id, d);
    for (const d of incoming.diary_entries || []) {
      const existing = diaryMap.get(d.id);
      if (!existing || d.updated_at > existing.updated_at) diaryMap.set(d.id, d);
    }
    const mergedDiary = Array.from(diaryMap.values());
    const validDiaryIds = new Set(mergedDiary.map((d) => d.id));

    // 10. Diary tags
    const diaryTagMap = new Map<string, NonNullable<typeof current.diary_entry_habits>[0]>();
    for (const t of current.diary_entry_habits || []) {
      if (validDiaryIds.has(t.diary_entry_id) && validHabitIds.has(t.habit_id)) {
        diaryTagMap.set(t.id, t);
      }
    }
    for (const t of incoming.diary_entry_habits || []) {
      if (validDiaryIds.has(t.diary_entry_id) && validHabitIds.has(t.habit_id)) {
        if (!diaryTagMap.has(t.id)) diaryTagMap.set(t.id, t);
      }
    }
    const mergedDiaryTags = Array.from(diaryTagMap.values());

    // 11. Idea categories
    const catMap = new Map<string, NonNullable<typeof current.idea_categories>[0]>();
    for (const c of current.idea_categories || []) catMap.set(c.id, c);
    for (const c of incoming.idea_categories || []) {
      const existing = catMap.get(c.id);
      if (!existing || c.updated_at > existing.updated_at) catMap.set(c.id, c);
    }
    const mergedCats = Array.from(catMap.values());
    const validCatIds = new Set(mergedCats.map((c) => c.id));

    // 12. Idea cards
    const cardMap = new Map<string, NonNullable<typeof current.idea_cards>[0]>();
    for (const c of current.idea_cards || []) {
      if (validCatIds.has(c.category_id)) cardMap.set(c.id, c);
    }
    for (const c of incoming.idea_cards || []) {
      if (!validCatIds.has(c.category_id)) continue;
      const existing = cardMap.get(c.id);
      if (!existing || c.updated_at > existing.updated_at) cardMap.set(c.id, c);
    }
    const mergedCards = Array.from(cardMap.values());

    // 13. Badges
    const badgeMap = new Map<string, NonNullable<typeof current.user_badges>[0]>();
    for (const b of current.user_badges || []) badgeMap.set(b.badge_id, b);
    for (const b of incoming.user_badges || []) {
      if (!badgeMap.has(b.badge_id)) badgeMap.set(b.badge_id, b);
    }
    const mergedBadges = Array.from(badgeMap.values());

    // 14. Level & XP
    const currentXp = current.user_level?.total_xp ?? 0;
    const incomingXp = incoming.user_level?.total_xp ?? 0;
    const mergedLevel = incomingXp > currentXp ? incoming.user_level : current.user_level;

    // 15. Scratch pad
    let mergedScratch = current.scratch_pad || { content: "", updated_at: "" };
    if (!mergedScratch.content?.trim() && incoming.scratch_pad?.content?.trim()) {
      mergedScratch = incoming.scratch_pad;
    } else if (incoming.scratch_pad?.content?.trim() && incoming.scratch_pad.content !== mergedScratch.content) {
      if (incoming.scratch_pad.updated_at > (mergedScratch.updated_at || "")) {
        mergedScratch = incoming.scratch_pad;
      }
    }

    // 16. Settings
    const mergedSettings =
      current.settings?.updated_at && current.settings.updated_at > (incoming.settings?.updated_at || "")
        ? current.settings
        : incoming.settings || current.settings;

    // 17. Shortcuts
    const shortcutMap = new Map<string, NonNullable<typeof current.shortcuts>[0]>();
    for (const s of current.shortcuts || []) shortcutMap.set(s.id, s);
    for (const s of incoming.shortcuts || []) {
      if (!shortcutMap.has(s.id)) shortcutMap.set(s.id, s);
    }
    const mergedShortcuts = Array.from(shortcutMap.values());

    // 18. Challenges
    const challengeMap = new Map<string, NonNullable<typeof current.challenges>[0]>();
    for (const c of current.challenges || []) challengeMap.set(c.id, c);
    for (const c of incoming.challenges || []) {
      if (!challengeMap.has(c.id)) challengeMap.set(c.id, c);
    }
    const mergedChallenges = Array.from(challengeMap.values());
    const validChallengeIds = new Set(mergedChallenges.map((c) => c.id));

    // 19. Challenge participants
    const participantMap = new Map<string, NonNullable<typeof current.challenge_participants>[0]>();
    for (const p of current.challenge_participants || []) {
      if (validChallengeIds.has(p.challenge_id)) participantMap.set(p.id, p);
    }
    for (const p of incoming.challenge_participants || []) {
      if (!validChallengeIds.has(p.challenge_id)) continue;
      const existing = participantMap.get(p.id);
      if (!existing || p.progress > existing.progress) participantMap.set(p.id, p);
    }
    const mergedParticipants = Array.from(participantMap.values());

    // 20. Notes
    const noteMap = new Map<string, NonNullable<typeof current.notes>[0]>();
    for (const n of current.notes || []) noteMap.set(n.id, n);
    for (const n of incoming.notes || []) {
      const existing = noteMap.get(n.id);
      if (!existing || n.updated_at > existing.updated_at) noteMap.set(n.id, n);
    }
    const mergedNotes = Array.from(noteMap.values());

    // 21. Finance Transactions
    const txMap = new Map<string, NonNullable<typeof current.finance_transactions>[0]>();
    for (const t of current.finance_transactions || []) txMap.set(t.id, t);
    for (const t of incoming.finance_transactions || []) {
      if (!txMap.has(t.id)) txMap.set(t.id, t);
    }
    const mergedTx = Array.from(txMap.values());

    // 22. Finance Budgets
    const budgetMap = new Map<string, NonNullable<typeof current.finance_budgets>[0]>();
    for (const b of current.finance_budgets || []) budgetMap.set(b.category, b);
    for (const b of incoming.finance_budgets || []) {
      const existing = budgetMap.get(b.category);
      if (!existing || b.updated_at > existing.updated_at) budgetMap.set(b.category, b);
    }
    const mergedBudgets = Array.from(budgetMap.values());

    // 23. Investment Assets
    const assetMap = new Map<string, NonNullable<typeof current.investment_assets>[0]>();
    for (const a of current.investment_assets || []) assetMap.set(a.id, a);
    for (const a of incoming.investment_assets || []) {
      const existing = assetMap.get(a.id);
      if (!existing || a.updated_at > existing.updated_at) assetMap.set(a.id, a);
    }
    const mergedAssets = Array.from(assetMap.values());

    // 24. Stored Files
    const fileMap = new Map<string, NonNullable<typeof current.stored_files>[0]>();
    for (const f of current.stored_files || []) fileMap.set(f.id, f);
    for (const f of incoming.stored_files || []) {
      if (!fileMap.has(f.id)) fileMap.set(f.id, f);
    }
    const mergedFiles = Array.from(fileMap.values());

    // 25. AI & Notification Settings
    const mergedAiSettings = incoming.ai_settings || current.ai_settings;
    const mergedNotifications = incoming.notification_settings || current.notification_settings;

    return {
      habits: mergedHabits,
      daily_records: mergedRecords,
      journal_entries: mergedJournal,
      tasks: mergedTasks,
      projects: mergedProjects,
      weekly_plans: mergedPlans,
      goals: mergedGoals,
      milestones: mergedMilestones,
      diary_entries: mergedDiary,
      diary_entry_habits: mergedDiaryTags,
      idea_categories: mergedCats,
      idea_cards: mergedCards,
      scratch_pad: mergedScratch,
      user_badges: mergedBadges,
      user_level: mergedLevel,
      settings: mergedSettings,
      shortcuts: mergedShortcuts,
      challenges: mergedChallenges,
      challenge_participants: mergedParticipants,
      notes: mergedNotes,
      finance_transactions: mergedTx,
      finance_budgets: mergedBudgets,
      investment_assets: mergedAssets,
      stored_files: mergedFiles,
      ai_settings: mergedAiSettings,
      notification_settings: mergedNotifications,
    };
  });

  return {
    app: BACKUP_APP_ID,
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    data: merged,
  };
};

export const backupCounts = (backup: LocalBackup) => ({
  habits: backup.data.habits.length,
  records: backup.data.daily_records.length,
  journal: backup.data.journal_entries.length,
  tasks: backup.data.tasks.length,
  projects: backup.data.projects.length,
  plans: backup.data.weekly_plans?.length ?? 0,
  goals: backup.data.goals?.length ?? 0,
  milestones: backup.data.milestones?.length ?? 0,
  diary: backup.data.diary_entries?.length ?? 0,
  categories: backup.data.idea_categories?.length ?? 0,
  ideas: backup.data.idea_cards?.length ?? 0,
  badges: backup.data.user_badges?.length ?? 0,
  shortcuts: backup.data.shortcuts?.length ?? 0,
  challenges: backup.data.challenges?.length ?? 0,
  notes: backup.data.notes?.length ?? 0,
  transactions: backup.data.finance_transactions?.length ?? 0,
  budgets: backup.data.finance_budgets?.length ?? 0,
  investments: backup.data.investment_assets?.length ?? 0,
  files: backup.data.stored_files?.length ?? 0,
});