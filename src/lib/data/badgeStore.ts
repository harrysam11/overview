import { APP_MODE, type AppMode } from "@/lib/appMode";
import type { Badge } from "./defaultBadges";

export type { Badge };

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

export interface BadgeStore {
  mode: AppMode;
  listAllBadges(): Promise<Badge[]>;
  listEarnedBadges(): Promise<UserBadge[]>;
  awardBadge(badgeId: string): Promise<boolean>;
}

let storePromise: Promise<BadgeStore> | null = null;

export const getBadgeStore = (mode: AppMode = APP_MODE): Promise<BadgeStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudBadgeStore").then((m) => m.cloudBadgeStore)
        : import("./localBadgeStore").then((m) => m.localBadgeStore);
  }
  return storePromise;
};
