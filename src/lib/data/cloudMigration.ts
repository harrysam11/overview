import { mergeLocalData, backupCounts, exportLocalData } from "@/lib/local/backup";
import { BACKUP_APP_ID, BACKUP_SCHEMA_VERSION, type LocalBackup } from "@/lib/local/schema";

export interface CloudMigrationCredentials {
  email: string;
  password: string;
}

export interface CloudMigrationResult {
  success: boolean;
  counts: ReturnType<typeof backupCounts>;
  message?: string;
}

const iso = () => new Date().toISOString();
const stamp = (value?: string | null) => value || iso();

/**
 * Import the signed-in cloud account into the encrypted local vault.
 * This is deliberately cloud -> local only; it never deletes cloud data and
 * mergeLocalData preserves records already present in the local vault.
 */
export const migrateFromCloudAccount = async (
  credentials: CloudMigrationCredentials
): Promise<CloudMigrationResult> => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword(credentials);
  if (authError || !authData.user) {
    throw new Error(authError?.message || "Cloud authentication failed. Check your email and password.");
  }

  const user = authData.user;
  try {
    const requests = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id),
      supabase.from("daily_records").select("*").eq("user_id", user.id),
      supabase.from("journal_entries").select("*").eq("user_id", user.id),
      supabase.from("weekly_plans").select("*").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase.from("milestones").select("*").eq("user_id", user.id),
      supabase.from("diary_entries").select("*").eq("user_id", user.id),
      supabase.from("diary_entry_habits").select("*").eq("user_id", user.id),
      supabase.from("idea_categories").select("*").eq("user_id", user.id),
      supabase.from("idea_cards").select("*").eq("user_id", user.id),
      supabase.from("scratch_pad").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_badges").select("*").eq("user_id", user.id),
      supabase.from("user_levels").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("app_shortcuts").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("challenges").select("*").eq("creator_id", user.id),
      supabase.from("challenge_participants").select("*").eq("user_id", user.id),
    ]);

    const [
      habitsResult, recordsResult, journalsResult, plansResult, goalsResult, milestonesResult,
      diariesResult, diaryTagsResult, categoriesResult, cardsResult, scratchResult, badgesResult,
      levelsResult, shortcutsResult, profileResult, challengesResult, participantsResult,
    ] = requests;
    const firstError = requests.find((result) => result.error)?.error;
    if (firstError) throw new Error(`Cloud export failed: ${firstError.message}`);

    const habits = habitsResult.data;
    const records = recordsResult.data;
    const journals = journalsResult.data;
    const plans = plansResult.data;
    const goals = goalsResult.data;
    const milestones = milestonesResult.data;
    const diaries = diariesResult.data;
    const diaryTags = diaryTagsResult.data;
    const categories = categoriesResult.data;
    const cards = cardsResult.data;
    const scratch = scratchResult.data;
    const badges = badgesResult.data;
    const levels = levelsResult.data;
    const shortcuts = shortcutsResult.data;
    const profile = profileResult.data;
    const challenges = challengesResult.data;
    const participants = participantsResult.data;

    const cloudBackup: LocalBackup = {
      app: BACKUP_APP_ID,
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: iso(),
      data: {
        habits: (habits || []).map((h) => ({
          id: h.id, name: h.name, type: h.type === "dont" ? "dont" : "do",
          is_active: h.is_active ?? true, notes: h.notes ?? null,
          created_at: stamp(h.created_at), updated_at: stamp(h.updated_at),
        })),
        daily_records: (records || []).map((r) => ({
          id: r.id, habit_id: r.habit_id, record_date: r.record_date,
          completed: r.completed ?? false, created_at: stamp(r.created_at), updated_at: stamp(r.updated_at),
        })),
        journal_entries: (journals || []).map((j) => ({
          id: j.id, entry_date: j.entry_date, content: j.content || "",
          created_at: stamp(j.created_at), updated_at: stamp(j.updated_at),
        })),
        tasks: [],
        projects: [],
        weekly_plans: (plans || []).map((p) => ({
          id: p.id, week_start: p.week_start, title: p.title,
          priority: p.priority === "high" || p.priority === "low" ? p.priority : "medium",
          is_completed: Boolean(p.is_completed), sort_order: p.sort_order ?? 0,
          created_at: stamp(p.created_at), updated_at: stamp(p.updated_at),
        })),
        goals: (goals || []).map((g) => ({
          id: g.id, title: g.title, description: g.description ?? null,
          target_date: g.target_date ?? null, status: g.status || "in_progress",
          sort_order: g.sort_order ?? 0, created_at: stamp(g.created_at), updated_at: stamp(g.updated_at),
        })),
        milestones: (milestones || []).map((m) => ({
          id: m.id, goal_id: m.goal_id, title: m.title,
          is_completed: Boolean(m.is_completed), sort_order: m.sort_order ?? 0,
          created_at: stamp(m.created_at),
        })),
        diary_entries: (diaries || []).map((d) => ({
          id: d.id, entry_date: d.entry_date, title: d.title ?? null, content: d.content ?? {},
          created_at: stamp(d.created_at), updated_at: stamp(d.updated_at),
        })),
        diary_entry_habits: (diaryTags || []).map((t) => ({
          id: t.id, diary_entry_id: t.diary_entry_id, habit_id: t.habit_id, created_at: stamp(t.created_at),
        })),
        idea_categories: (categories || []).map((c) => ({
          id: c.id, name: c.name, color: c.color || "#6366f1",
          sort_order: c.sort_order ?? 0, created_at: stamp(c.created_at),
        })),
        idea_cards: (cards || []).map((c) => ({
          id: c.id, category_id: c.category_id, title: c.title, content: c.content ?? null,
          sort_order: c.sort_order ?? 0, created_at: stamp(c.created_at), updated_at: stamp(c.updated_at),
        })),
        scratch_pad: { content: scratch?.content || "", updated_at: stamp(scratch?.updated_at) },
        user_badges: (badges || []).map((b) => ({
          id: b.id, badge_id: b.badge_id, earned_at: stamp(b.earned_at),
        })),
        user_level: { total_xp: levels?.total_xp ?? 0, updated_at: stamp(levels?.updated_at) },
        settings: {
          username: profile?.username ?? null, display_name: profile?.display_name ?? null,
          updated_at: stamp(profile?.created_at),
        },
        shortcuts: (shortcuts || []).map((s) => ({
          id: s.id, name: s.name, url: s.url, favicon_url: s.favicon_url ?? null,
          sort_order: s.sort_order ?? 0, created_at: stamp(s.created_at),
        })),
        challenges: (challenges || []).map((c) => ({
          id: c.id, creator_id: "local-user", name: c.name, description: c.description ?? null,
          start_date: stamp(c.start_date), end_date: stamp(c.end_date),
          goal_type: c.goal_type, goal_value: c.goal_value, is_public: false,
          created_at: stamp(c.created_at),
        })),
        challenge_participants: (participants || [])
          .filter((p) => (challenges || []).some((c) => c.id === p.challenge_id))
          .map((p) => ({
            id: p.id, challenge_id: p.challenge_id, user_id: "local-user",
            progress: p.progress ?? 0, joined_at: stamp(p.joined_at),
            profile_name: profile?.display_name || "You",
          })),
        notes: [],
        finance_transactions: [],
        finance_budgets: [],
        investment_assets: [],
        stored_files: [],
        ai_settings: {
          endpoint: "http://127.0.0.1:11434", model: "llama3", is_enabled: true,
          system_prompt: "You are an offline personal habit coach in HabitFlow LifeOS.",
        },
        notification_settings: {
          enabled: false, morning_time: "08:00", evening_time: "21:00", last_notified_date: "",
        },
      },
    };

    const mergedResult = await mergeLocalData(cloudBackup);
    return { success: true, counts: backupCounts(mergedResult) };
  } finally {
    await supabase.auth.signOut().catch(() => {});
  }
};


export interface LocalToCloudMigrationResult {
  success: boolean;
  counts: ReturnType<typeof backupCounts>;
  localOnly: { tasks: number; projects: number; notes: number; financeTransactions: number; financeBudgets: number; investmentAssets: number; files: number };
}

/**
 * Push supported records from the unlocked encrypted local vault into the
 * signed-in user's cloud account. This is an explicit, repeatable merge:
 * it never deletes local data. For date-keyed conflicts, local values win.
 */
export const migrateLocalDataToCloud = async (
  credentials: CloudMigrationCredentials
): Promise<LocalToCloudMigrationResult> => {
  const backup = await exportLocalData();
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword(credentials);
  if (authError || !authData.user) {
    throw new Error(authError?.message || "Cloud authentication failed. Check your email and password.");
  }

  const userId = authData.user.id;
  const data = backup.data;
  const upsert = async (table: string, rows: Record<string, unknown>[], onConflict = "id") => {
    if (!rows.length) return;
    const { error } = await (supabase as any).from(table).upsert(rows, { onConflict });
    if (error) throw new Error(`Could not sync ${table}: ${error.message}`);
  };

  try {
    // Parent records first so foreign-key dependencies are already present.
    await upsert("habits", data.habits.map((h) => ({
      id: h.id, user_id: userId, name: h.name, type: h.type,
      is_active: h.is_active, notes: h.notes ?? null, created_at: h.created_at, updated_at: h.updated_at,
    })));
    await upsert("daily_records", data.daily_records.map((r) => ({
      id: r.id, user_id: userId, habit_id: r.habit_id, record_date: r.record_date,
      completed: r.completed ?? false, created_at: r.created_at, updated_at: r.updated_at,
    })), "user_id,record_date,habit_id");
    await upsert("journal_entries", data.journal_entries.map((j) => ({
      id: j.id, user_id: userId, entry_date: j.entry_date, content: j.content,
      created_at: j.created_at, updated_at: j.updated_at,
    })), "user_id,entry_date");

    await upsert("weekly_plans", (data.weekly_plans || []).map((p) => ({
      id: p.id, user_id: userId, week_start: p.week_start, title: p.title,
      priority: p.priority, is_completed: p.is_completed, sort_order: p.sort_order,
      created_at: p.created_at, updated_at: p.updated_at,
    })));
    await upsert("goals", data.goals.map((g) => ({
      id: g.id, user_id: userId, title: g.title, description: g.description,
      target_date: g.target_date, status: g.status, sort_order: g.sort_order,
      created_at: g.created_at, updated_at: g.updated_at,
    })));
    await upsert("milestones", data.milestones.map((m) => ({
      id: m.id, user_id: userId, goal_id: m.goal_id, title: m.title,
      is_completed: m.is_completed, sort_order: m.sort_order, created_at: m.created_at,
    })));

    await upsert("diary_entries", data.diary_entries.map((d) => ({
      id: d.id, user_id: userId, entry_date: d.entry_date, title: d.title,
      content: d.content, created_at: d.created_at, updated_at: d.updated_at,
    })));
    await upsert("diary_entry_habits", data.diary_entry_habits.map((t) => ({
      id: t.id, user_id: userId, diary_entry_id: t.diary_entry_id,
      habit_id: t.habit_id, created_at: t.created_at,
    })), "user_id,diary_entry_id,habit_id");

    await upsert("idea_categories", data.idea_categories.map((c) => ({
      id: c.id, user_id: userId, name: c.name, color: c.color,
      sort_order: c.sort_order, created_at: c.created_at,
    })));
    await upsert("idea_cards", data.idea_cards.map((c) => ({
      id: c.id, user_id: userId, category_id: c.category_id, title: c.title,
      content: c.content, sort_order: c.sort_order, created_at: c.created_at, updated_at: c.updated_at,
    })));
    await upsert("scratch_pad", [{
      user_id: userId, content: data.scratch_pad.content, updated_at: data.scratch_pad.updated_at || iso(),
    }], "user_id");
    await upsert("app_shortcuts", data.shortcuts.map((s) => ({
      id: s.id, user_id: userId, name: s.name, url: s.url,
      favicon_url: s.favicon_url, sort_order: s.sort_order, created_at: s.created_at,
    })));

    const localChallenges = data.challenges || [];
    await upsert("challenges", localChallenges.map((c) => ({
      id: c.id, creator_id: userId, name: c.name, description: c.description,
      start_date: c.start_date, end_date: c.end_date, goal_type: c.goal_type,
      goal_value: c.goal_value, is_public: false, created_at: c.created_at,
    })));
    const challengeIds = new Set(localChallenges.map((c) => c.id));
    await upsert("challenge_participants", (data.challenge_participants || [])
      .filter((p) => challengeIds.has(p.challenge_id))
      .map((p) => ({
        id: p.id, challenge_id: p.challenge_id, user_id: userId,
        progress: p.progress, joined_at: p.joined_at,
      })), "challenge_id,user_id");

    // Profile row is created by the auth.users trigger; only update allowed columns.
    const { error: profileError } = await supabase.from("profiles")
      .update({ username: data.settings.username, display_name: data.settings.display_name })
      .eq("id", userId);
    if (profileError) throw new Error(`Could not sync profile: ${profileError.message}`);

    // XP can only increase through the guarded RPC; never lower an existing cloud total.
    const { data: cloudLevel, error: levelError } = await supabase.from("user_levels")
      .select("total_xp").eq("user_id", userId).maybeSingle();
    if (levelError) throw new Error(`Could not read cloud XP: ${levelError.message}`);
    const xpDelta = Math.max(0, data.user_level.total_xp - (cloudLevel?.total_xp ?? 0));
    if (xpDelta > 0) {
      const { error } = await supabase.rpc("increment_xp", { p_amount: xpDelta });
      if (error) throw new Error(`Could not sync XP: ${error.message}`);
    }

    // Badge awards are recalculated server-side from the migrated activity data.
    const { data: badgeDefinitions, error: badgeError } = await supabase.from("badges").select("id");
    if (badgeError) throw new Error(`Could not load badge definitions: ${badgeError.message}`);
    for (const badge of badgeDefinitions || []) {
      const { error } = await supabase.rpc("award_badge_if_earned", {
        p_user_id: userId, p_badge_id: badge.id,
      });
      if (error) throw new Error(`Could not recalculate badges: ${error.message}`);
    }

    return {
      success: true,
      counts: backupCounts(backup),
      localOnly: {
        tasks: data.tasks.length, projects: data.projects.length, notes: data.notes.length,
        financeTransactions: data.finance_transactions.length, financeBudgets: data.finance_budgets.length,
        investmentAssets: data.investment_assets.length, files: data.stored_files.length,
      },
    };
  } finally {
    await supabase.auth.signOut().catch(() => {});
  }
};
