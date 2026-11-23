import { APP_MODE, type AppMode } from "@/lib/appMode";
import type { LevelDefinition } from "./defaultLevels";

export type { LevelDefinition };

export interface UserLevel {
  currentLevel: LevelDefinition;
  nextLevel: LevelDefinition | null;
  totalXp: number;
  xpToNextLevel: number;
  progressPercent: number;
}

export interface LevelStore {
  mode: AppMode;
  listLevels(): Promise<LevelDefinition[]>;
  getTotalXp(): Promise<number>;
  addXp(amount: number): Promise<number>;
}

let storePromise: Promise<LevelStore> | null = null;

export const getLevelStore = (mode: AppMode = APP_MODE): Promise<LevelStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudLevelStore").then((m) => m.cloudLevelStore)
        : import("./localLevelStore").then((m) => m.localLevelStore);
  }
  return storePromise;
};
