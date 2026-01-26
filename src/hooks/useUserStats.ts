import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserStats } from "./useBadges";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get habits completed count
      const { count: habitsCount } = await supabase
        .from("daily_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true);

      // Get journal entries count
      const { count: journalCount } = await supabase
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get friends count
      const { count: friendsCount } = await supabase
        .from("friend_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      // Calculate total points (habits + journal * 2)
      const totalPoints = (habitsCount || 0) + (journalCount || 0) * 2;

      setStats({
        streak_days: currentStreak,
        habits_completed: habitsCount || 0,
        journal_entries: journalCount || 0,
        total_points: totalPoints,
        friends_count: friendsCount || 0,
      });
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
