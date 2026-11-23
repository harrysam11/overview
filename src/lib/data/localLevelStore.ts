import { nowIso } from "@/lib/local/localDb";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import { DEFAULT_LEVELS, type LevelDefinition } from "./defaultLevels";
import type { LevelStore } from "./levelStore";

export const localLevelStore: LevelStore = {
  mode: "local",

  async listLevels(): Promise<LevelDefinition[]> {
    return [...DEFAULT_LEVELS];
  },

  async getTotalXp(): Promise<number> {
    const data = await readVaultData();
    return data.user_level?.total_xp || 0;
  },

  async addXp(amount: number): Promise<number> {
    const now = nowIso();
    let newXp = 0;
    await updateVaultData((current) => {
      const currentXp = current.user_level?.total_xp || 0;
      newXp = Math.max(0, currentXp + amount);
      return {
        ...current,
        user_level: {
          total_xp: newXp,
          updated_at: now,
        },
      };
    });
    return newXp;
  },
};
