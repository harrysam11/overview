import {
  User,
  Sword,
  Shield,
  Anchor,
  Medal,
  Star,
  Target,
  Crown,
  Flame,
  Trophy,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserLevel } from "@/hooks/useLevel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Sword,
  Shield,
  Anchor,
  Medal,
  Star,
  Target,
  Crown,
  Flame,
  Trophy,
};

const levelColors: Record<number, string> = {
  1: "text-gray-500",
  2: "text-green-500",
  3: "text-blue-500",
  4: "text-cyan-500",
  5: "text-purple-500",
  6: "text-pink-500",
  7: "text-orange-500",
  8: "text-yellow-500",
  9: "text-red-500",
  10: "text-amber-400",
};

const levelBgColors: Record<number, string> = {
  1: "bg-gray-500/10",
  2: "bg-green-500/10",
  3: "bg-blue-500/10",
  4: "bg-cyan-500/10",
  5: "bg-purple-500/10",
  6: "bg-pink-500/10",
  7: "bg-orange-500/10",
  8: "bg-yellow-500/10",
  9: "bg-red-500/10",
  10: "bg-amber-400/10",
};

interface LevelDisplayProps {
  userLevel: UserLevel | null;
  loading?: boolean;
  compact?: boolean;
}

export const LevelDisplay = ({ userLevel, loading, compact = false }: LevelDisplayProps) => {
  if (loading || !userLevel) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { currentLevel, nextLevel, totalXp, xpToNextLevel, progressPercent } = userLevel;
  const IconComponent = iconMap[currentLevel.icon] || HelpCircle;
  const levelColor = levelColors[currentLevel.level] || "text-primary";
  const levelBg = levelBgColors[currentLevel.level] || "bg-primary/10";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-full", levelBg)}>
          <IconComponent className={cn("h-4 w-4", levelColor)} />
        </div>
        <div className="flex flex-col">
          <span className={cn("text-sm font-semibold", levelColor)}>
            Lvl {currentLevel.level} • {currentLevel.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {totalXp.toLocaleString()} XP
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <IconComponent className={cn("h-5 w-5", levelColor)} />
          Level & Rank
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-full", levelBg)}>
            <IconComponent className={cn("h-8 w-8", levelColor)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold", levelColor)}>
                {currentLevel.title}
              </span>
              <span className="text-sm text-muted-foreground">
                Level {currentLevel.level}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {totalXp.toLocaleString()} total XP
            </p>
          </div>
        </div>

        {nextLevel && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progress to {nextLevel.title}
              </span>
              <span className={cn("font-medium", levelColor)}>
                {xpToNextLevel.toLocaleString()} XP to go
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {!nextLevel && (
          <p className="text-center text-sm text-muted-foreground">
            🎉 You've reached the maximum level!
          </p>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Earn XP by completing habits (+10), writing journals (+20), and earning badges
        </p>
      </CardContent>
    </Card>
  );
};
