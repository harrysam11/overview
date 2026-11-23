import { newId, nowIso } from "@/lib/local/localDb";
import { localUserBadgeSchema, type LocalUserBadge } from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import { DEFAULT_BADGES, type Badge } from "./defaultBadges";
import type { BadgeStore, UserBadge } from "./badgeStore";

export const localBadgeStore: BadgeStore = {
  mode: "local",

  async listAllBadges(): Promise<Badge[]> {
    return [...DEFAULT_BADGES];
  },

  async listEarnedBadges(): Promise<UserBadge[]> {
    const data = await readVaultData();
    const userBadges = data.user_badges || [];
    const badgeMap = new Map<string, Badge>();
    for (const b of DEFAULT_BADGES) {
      badgeMap.set(b.id, b);
      badgeMap.set(b.name.toLowerCase(), b);
    }

    const result: UserBadge[] = [];
    for (const ub of userBadges) {
      const badge = badgeMap.get(ub.badge_id) || badgeMap.get(ub.badge_id.toLowerCase());
      if (badge) {
        result.push({
          id: ub.id,
          badge_id: badge.id,
          earned_at: ub.earned_at,
          badge,
        });
      }
    }
    return result;
  },

  async awardBadge(badgeId: string): Promise<boolean> {
    const now = nowIso();
    let awarded = false;
    await updateVaultData((current) => {
      const existing = (current.user_badges || []).find((b) => b.badge_id === badgeId);
      if (existing) return current;

      const newBadge: LocalUserBadge = localUserBadgeSchema.parse({
        id: newId(),
        badge_id: badgeId,
        earned_at: now,
      });
      awarded = true;
      return {
        ...current,
        user_badges: [...(current.user_badges || []), newBadge],
      };
    });
    return awarded;
  },
};
