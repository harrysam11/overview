import { useState, useEffect, useCallback } from "react";
import { isLocalMode } from "@/lib/appMode";
import { readVaultData } from "@/lib/local/vault";
import type { UserStats } from "@/lib/data/badgeStore";

export const useUserStats = (currentStreak: number = 0) => {
  const [stats, setStats] = useState<UserStats>({
    streak_days: 0,
    habits_completed: 0,
    journal_entries: 0,
    total_points: 0,
    friends_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      if (isLocalMode) {
        const vault = await readVaultData();
        const habitsCount = (vault.daily_records || []).filter((r) => r.completed).length;
        const journalCount = (vault.journal_entries || []).filter((j) => j.content && j.content.trim().length > 0).length
          + (vault.diary_entries || []).length;
        const totalPoints = vault.user_level?.total_xp || (habitsCount + journalCount * 2);

        setStats({
          streak_days: currentStreak,
          habits_completed: habitsCount,
          journal_entries: journalCount,
          total_points: totalPoints,
          friends_count: 0,
        });
      } else {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count: habitsCount } = await supabase
          .from("daily_records")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true);

        const { count: journalCount } = await supabase
          .from("journal_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { count: friendsCount } = await supabase
          .from("friend_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

        const totalPoints = (habitsCount || 0) + (journalCount || 0) * 2;

        setStats({
          streak_days: currentStreak,
          habits_completed: habitsCount || 0,
          journal_entries: journalCount || 0,
          total_points: totalPoints,
          friends_count: friendsCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  }, [currentStreak]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};
