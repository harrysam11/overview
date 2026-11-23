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

export const migrateFromCloudAccount = async (
  credentials: CloudMigrationCredentials
): Promise<CloudMigrationResult> => {
  // Dynamically import the Supabase client so local mode never statically bundles or connects to it
  const { supabase } = await import("@/integrations/supabase/client");

  // Sign in to cloud
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Cloud authentication failed. Please verify your email and password.");
  }

  const user = authData.user;

  try {
    // 1. Fetch habits
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id);

    // 2. Fetch daily records
    const { data: recordsData } = await supabase
      .from("daily_records")
      .select("*")
      .eq("user_id", user.id);

    // 3. Fetch journal entries
    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id);

    // 4. Fetch weekly plans
    const { data: plansData } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", user.id);

    // 5. Fetch goals
    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id);

    // 6. Fetch milestones
    const { data: milestonesData } = await supabase
      .from("milestones")
      .select("*")
      .eq("user_id", user.id);

    // 7. Fetch diary entries
    const { data: diaryData } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", user.id);

    // 8. Fetch diary tags
    const { data: diaryTagsData } = await supabase
      .from("diary_entry_habits")
      .select("*");

    // 9. Fetch ideas
    const { data: categoriesData } = await supabase
      .from("idea_categories")
      .select("*")
      .eq("user_id", user.id);

    const { data: cardsData } = await supabase
      .from("idea_cards")
      .select("*")
      .eq("user_id", user.id);

    // 10. Fetch scratch pad
    const { data: scratchData } = await supabase
      .from("scratch_pad")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 11. Fetch badges
    const { data: badgesData } = await supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", user.id);

    // 12. Fetch levels
    const { data: levelsData } = await supabase
      .from("user_levels")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 13. Fetch shortcuts
    const { data: shortcutsData } = await supabase
      .from("app_shortcuts")
      .select("*")
      .eq("user_id", user.id);

    // 14. Fetch profile / settings
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // 15. Fetch challenges
    const { data: challengesData } = await supabase
      .from("challenges")
      .select("*")
      .eq("creator_id", user.id);

    const { data: participantsData } = await supabase
      .from("challenge_participants")
      .select("*")
      .eq("user_id", user.id);

    // 16. LifeOS tasks and projects from localStorage if available
    let tasks: Array<{ id: string; title: string; done: boolean }> = [];
    let projects: Array<{ id: string; title: string; area: string }> = [];
    try {
      if (typeof window !== "undefined") {
        const rawTasks = window.localStorage.getItem("habitflow-lifeos-tasks");
        const rawProjects = window.localStorage.getItem("habitflow-lifeos-projects");
        if (rawTasks) tasks = JSON.parse(rawTasks);
        if (rawProjects) projects = JSON.parse(rawProjects);
      }
    } catch {
      // non-fatal
    }

    // Format into LocalBackup envelope
    const cloudBackup: LocalBackup = {
      app: BACKUP_APP_ID,
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      data: {
        habits: (habitsData || []).map((h) => ({
          id: h.id,
          name: h.name,
          type: h.type === "dont" ? "dont" : "do",
          is_active: h.is_active ?? true,
          notes: h.notes || null,
          created_at: h.created_at || new Date().toISOString(),
          updated_at: h.updated_at || h.created_at || new Date().toISOString(),
        })),
        daily_records: (recordsData || []).map((r) => ({
          id: r.id,
          habit_id: r.habit_id,
          record_date: r.record_date,
          completed: r.completed ?? true,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || r.created_at || new Date().toISOString(),
        })),
        journal_entries: (journalData || []).map((j) => ({
          id: j.id,
          entry_date: j.entry_date,
          content: j.content || "",
          created_at: j.created_at || new Date().toISOString(),
          updated_at: j.updated_at || j.created_at || new Date().toISOString(),
        })),
        tasks: tasks.map((t) => ({ id: t.id, title: t.title, done: t.done })),
        projects: projects.map((p) => ({ id: p.id, title: p.title, area: p.area })),
        weekly_plans: (plansData || []).map((p) => ({
          id: p.id,
          week_start: p.week_start,
          goals: Array.isArray(p.goals) ? p.goals : [],
          priorities: Array.isArray(p.priorities) ? p.priorities : [],
          notes: p.notes || "",
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || p.created_at || new Date().toISOString(),
        })),
        goals: (goalsData || []).map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description || null,
          category: g.category || "personal",
          target_date: g.target_date || null,
          progress: g.progress ?? 0,
          status: g.status || "in_progress",
          created_at: g.created_at || new Date().toISOString(),
          updated_at: g.updated_at || g.created_at || new Date().toISOString(),
        })),
        milestones: (milestonesData || []).map((m) => ({
          id: m.id,
          goal_id: m.goal_id,
          title: m.title,
          target_date: m.target_date || null,
          is_completed: m.is_completed ?? false,
          created_at: m.created_at || new Date().toISOString(),
          updated_at: m.updated_at || m.created_at || new Date().toISOString(),
        })),
        diary_entries: (diaryData || []).map((d) => ({
          id: d.id,
          title: d.title || null,
          content: d.content || "",
          mood: d.mood || null,
          tags: Array.isArray(d.tags) ? d.tags : [],
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || d.created_at || new Date().toISOString(),
        })),
        diary_entry_habits: (diaryTagsData || []).map((t) => ({
          id: t.id,
          diary_entry_id: t.diary_entry_id,
          habit_id: t.habit_id,
          created_at: t.created_at || new Date().toISOString(),
        })),
        idea_categories: (categoriesData || []).map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color || "#6366f1",
          sort_order: c.sort_order ?? 0,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || c.created_at || new Date().toISOString(),
        })),
        idea_cards: (cardsData || []).map((c) => ({
          id: c.id,
          category_id: c.category_id,
          title: c.title,
          content: c.content || null,
          tags: Array.isArray(c.tags) ? c.tags : [],
          sort_order: c.sort_order ?? 0,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || c.created_at || new Date().toISOString(),
        })),
        scratch_pad: {
          content: scratchData?.content || "",
          updated_at: scratchData?.updated_at || new Date().toISOString(),
        },
        user_badges: (badgesData || []).map((b) => ({
          id: b.id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}`),
          badge_id: b.badge_id,
          earned_at: b.earned_at || new Date().toISOString(),
        })),
        user_level: {
          total_xp: levelsData?.total_xp ?? 0,
          updated_at: levelsData?.updated_at || new Date().toISOString(),
        },
        settings: {
          username: profileData?.username || null,
          display_name: profileData?.display_name || null,
          updated_at: profileData?.updated_at || new Date().toISOString(),
        },
        shortcuts: (shortcutsData || []).map((s) => ({
          id: s.id,
          label: s.label,
          path: s.path,
          icon_name: s.icon_name || "Star",
          sort_order: s.sort_order ?? 0,
          is_active: s.is_active ?? true,
          created_at: s.created_at || new Date().toISOString(),
        })),
        challenges: (challengesData || []).map((c) => ({
          id: c.id,
          creator_id: "local-user",
          name: c.name,
          description: c.description || null,
          start_date: c.start_date,
          end_date: c.end_date,
          goal_type: c.goal_type || "points",
          goal_value: c.goal_value || 100,
          is_public: false,
          created_at: c.created_at || new Date().toISOString(),
        })),
        challenge_participants: (participantsData || []).map((p) => ({
          id: p.id,
          challenge_id: p.challenge_id,
          user_id: "local-user",
          progress: p.progress || 0,
          joined_at: p.joined_at || new Date().toISOString(),
          profile_name: profileData?.display_name || "You",
        })),
      },
    };

    // Merge into local vault safely
    const mergedResult = await mergeLocalData(cloudBackup);
    const counts = backupCounts(mergedResult);

    return {
      success: true,
      counts,
    };
  } finally {
    // Clean up Supabase session so memory and local state remain pure local mode
    await supabase.auth.signOut().catch(() => {});
  }
};
