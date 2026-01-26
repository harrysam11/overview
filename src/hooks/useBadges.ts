import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

export interface UserStats {
  streak_days: number;
  habits_completed: number;
  journal_entries: number;
  total_points: number;
  friends_count: number;
}

export const useBadges = () => {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const { toast } = useToast();

  const fetchBadges = useCallback(async () => {
    try {
      const { data: badges, error: badgesError } = await supabase
        .from("badges")
        .select("*")
        .order("requirement_value");

      if (badgesError) throw badgesError;
      setAllBadges((badges || []) as Badge[]);

      const { data: userBadges, error: userBadgesError } = await supabase
        .from("user_badges")
        .select(`
          id,
          badge_id,
          earned_at,
          badge:badges(*)
        `);

      if (userBadgesError) throw userBadgesError;
      
      const formattedBadges = (userBadges || []).map((ub: any) => ({
        id: ub.id,
        badge_id: ub.badge_id,
        earned_at: ub.earned_at,
        badge: ub.badge
      }));
      
      setEarnedBadges(formattedBadges);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const earnedBadgeIds = new Set(earnedBadges.map(eb => eb.badge_id));
    
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
        const { error } = await supabase
          .from("user_badges")
          .insert({
            user_id: user.id,
            badge_id: badge.id
          });

        if (!error) {
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
    return allBadges.filter(b => b.category === category);
  }, [allBadges]);

  const isEarned = useCallback((badgeId: string) => {
    return earnedBadges.some(eb => eb.badge_id === badgeId);
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
    refetch: fetchBadges
  };
};
