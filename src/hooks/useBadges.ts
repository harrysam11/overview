import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getBadgeStore, type Badge, type UserBadge, type UserStats } from "@/lib/data/badgeStore";

export type { Badge, UserBadge, UserStats };

export const useBadges = () => {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const { toast } = useToast();

  const fetchBadges = useCallback(async () => {
    try {
      const store = await getBadgeStore();
      const [all, earned] = await Promise.all([
        store.listAllBadges(),
        store.listEarnedBadges(),
      ]);
      setAllBadges(all);
      setEarnedBadges(earned);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const checkAndAwardBadges = useCallback(async (stats: UserStats) => {
    const store = await getBadgeStore();
    const earnedBadgeIds = new Set(earnedBadges.map((eb) => eb.badge_id));

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let qualified = false;

      switch (badge.requirement_type) {
        case "streak_days":
          qualified = stats.streak_days >= badge.requirement_value;
          break;
        case "habits_completed":
          qualified = stats.habits_completed >= badge.requirement_value;
          break;
        case "journal_entries":
          qualified = stats.journal_entries >= badge.requirement_value;
          break;
        case "total_points":
          qualified = stats.total_points >= badge.requirement_value;
          break;
        case "friends_count":
          qualified = stats.friends_count >= badge.requirement_value;
          break;
      }

      if (qualified) {
        const awarded = await store.awardBadge(badge.id);
        if (awarded) {
          setNewBadge(badge);
          toast({
            title: "🏆 Badge Earned!",
            description: `You earned the "${badge.name}" badge!`,
          });
          await fetchBadges();
        }
      }
    }
  }, [allBadges, earnedBadges, fetchBadges, toast]);

  const dismissNewBadge = useCallback(() => {
    setNewBadge(null);
  }, []);

  const getBadgesByCategory = useCallback((category: string) => {
    return allBadges.filter((b) => b.category === category);
  }, [allBadges]);

  const isEarned = useCallback((badgeId: string) => {
    return earnedBadges.some((eb) => eb.badge_id === badgeId);
  }, [earnedBadges]);

  return {
    allBadges,
    earnedBadges,
    loading,
    newBadge,
    checkAndAwardBadges,
    dismissNewBadge,
    getBadgesByCategory,
    isEarned,
    refetch: fetchBadges,
  };
};
