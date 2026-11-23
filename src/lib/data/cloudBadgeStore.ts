import { supabase } from "@/integrations/supabase/client";
import type { BadgeStore, UserBadge } from "./badgeStore";
import type { Badge } from "./defaultBadges";

export const cloudBadgeStore: BadgeStore = {
  mode: "cloud",

  async listAllBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("requirement_value");
    if (error) throw error;
    return (data || []) as Badge[];
  },

  async listEarnedBadges(): Promise<UserBadge[]> {
    const { data, error } = await supabase
      .from("user_badges")
      .select(`
        id,
        badge_id,
        earned_at,
        badge:badges(*)
      `);
    if (error) throw error;
    return (data || []).map((ub: any) => ({
      id: ub.id,
      badge_id: ub.badge_id,
      earned_at: ub.earned_at,
      badge: ub.badge,
    }));
  },

  async awardBadge(badgeId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: awarded, error } = await supabase.rpc("award_badge_if_earned", {
      p_user_id: user.id,
      p_badge_id: badgeId,
    });
    return !error && Boolean(awarded);
  },
};
