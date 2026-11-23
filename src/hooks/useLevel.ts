import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getLevelStore, type LevelDefinition, type UserLevel } from "@/lib/data/levelStore";

export type { LevelDefinition, UserLevel };

export const useLevel = () => {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [leveledUp, setLeveledUp] = useState<LevelDefinition | null>(null);
  const { toast } = useToast();

  const calculateLevel = useCallback((xp: number, levelDefs: LevelDefinition[]): UserLevel => {
    const sortedLevels = [...levelDefs].sort((a, b) => b.min_xp - a.min_xp);
    
    let currentLevel = sortedLevels[sortedLevels.length - 1]; // Default to first level
    for (const level of sortedLevels) {
      if (xp >= level.min_xp) {
        currentLevel = level;
        break;
      }
    }

    const currentIndex = levelDefs.findIndex(l => l.level === currentLevel.level);
    const nextLevel = currentIndex < levelDefs.length - 1 ? levelDefs[currentIndex + 1] : null;
    
    const xpInCurrentLevel = xp - currentLevel.min_xp;
    const xpRequiredForNext = nextLevel ? nextLevel.min_xp - currentLevel.min_xp : 0;
    const progressPercent = nextLevel ? Math.min((xpInCurrentLevel / xpRequiredForNext) * 100, 100) : 100;
    const xpToNextLevel = nextLevel ? nextLevel.min_xp - xp : 0;

    return {
      currentLevel,
      nextLevel,
      totalXp: xp,
      xpToNextLevel,
      progressPercent,
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const store = await getLevelStore();
      const [levelDefs, xp] = await Promise.all([
        store.listLevels(),
        store.getTotalXp(),
      ]);

      setLevels(levelDefs);
      if (levelDefs.length > 0) {
        setUserLevel(calculateLevel(xp, levelDefs));
      }
    } catch (error) {
      console.error("Error fetching level data:", error);
    } finally {
      setLoading(false);
    }
  }, [calculateLevel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addXp = useCallback(async (amount: number, reason?: string) => {
    try {
      if (!userLevel || levels.length === 0) return;
      const store = await getLevelStore();
      const newTotalXp = await store.addXp(amount);
      const oldLevel = userLevel.currentLevel;
      const newLevelData = calculateLevel(newTotalXp, levels);

      setUserLevel(newLevelData);

      // Check for level up
      if (newLevelData.currentLevel.level > oldLevel.level) {
        setLeveledUp(newLevelData.currentLevel);
        toast({
          title: `⬆️ Level Up! You're now a ${newLevelData.currentLevel.title}!`,
          description: `You've reached level ${newLevelData.currentLevel.level}`,
        });
      } else if (reason) {
        toast({
          title: `+${amount} XP`,
          description: reason,
        });
      }
    } catch (error) {
      console.error("Error adding XP:", error);
    }
  }, [userLevel, levels, calculateLevel, toast]);

  const dismissLevelUp = useCallback(() => {
    setLeveledUp(null);
  }, []);

  return {
    levels,
    userLevel,
    loading,
    leveledUp,
    addXp,
    dismissLevelUp,
    refetch: fetchData,
  };
};
