import { mergeLocalData, backupCounts } from "@/lib/local/backup";
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
