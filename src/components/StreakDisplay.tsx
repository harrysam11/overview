import { Flame, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  loading?: boolean;
}

export const StreakDisplay = ({ currentStreak, longestStreak, loading }: StreakDisplayProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-center">
            <div className="animate-pulse h-12 w-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame className="h-6 w-6 text-orange-500" />
              <span className="text-3xl font-bold text-orange-500">{currentStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <span className="text-3xl font-bold text-yellow-500">{longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Best Streak</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Days with 80%+ points build your streak
        </p>
      </CardContent>
    </Card>
  );
};
