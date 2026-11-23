export interface LevelDefinition {
  level: number;
  title: string;
  min_xp: number;
  icon: string;
}

export const DEFAULT_LEVELS: LevelDefinition[] = [
  { level: 1, title: "Recruit", min_xp: 0, icon: "User" },
  { level: 2, title: "Soldier", min_xp: 100, icon: "Sword" },
  { level: 3, title: "Warrior", min_xp: 300, icon: "Shield" },
  { level: 4, title: "Captain", min_xp: 600, icon: "Anchor" },
  { level: 5, title: "Commander", min_xp: 1000, icon: "Medal" },
  { level: 6, title: "Elite", min_xp: 1800, icon: "Star" },
  { level: 7, title: "Commando", min_xp: 3000, icon: "Target" },
  { level: 8, title: "Champion", min_xp: 5000, icon: "Crown" },
  { level: 9, title: "Dragon", min_xp: 8000, icon: "Flame" },
  { level: 10, title: "Legend", min_xp: 12000, icon: "Trophy" },
];
