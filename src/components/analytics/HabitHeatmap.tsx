import { useMemo, useState } from "react";
import { format, subDays, eachDayOfInterval, isSameDay } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Calendar, CheckCircle2, TrendingUp } from "lucide-react";
import type { DailyRecord, Habit } from "@/lib/data/habitStore";

interface HabitHeatmapProps {
  habits: Habit[];
  records: DailyRecord[];
  daysCount?: number;
}

export const HabitHeatmap = ({ habits, records, daysCount = 180 }: HabitHeatmapProps) => {
  const [selectedDay, setSelectedDay] = useState<{ date: string; completed: number; total: number; pct: number } | null>(null);

  const { days, statsByDate, activeDays, totalChecks, maxStreak } = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, daysCount - 1);
    const intervalDays = eachDayOfInterval({ start: startDate, end: today });

    const recordMap = new Map<string, number>();
    for (const r of records) {
      if (r.completed) {
        recordMap.set(r.record_date, (recordMap.get(r.record_date) || 0) + 1);
      }
    }

    let activeCount = 0;
    let checksCount = 0;
    const stats = new Map<string, { completed: number; total: number; pct: number }>();

    for (const d of intervalDays) {
      const dStr = format(d, "yyyy-MM-dd");
      const completed = recordMap.get(dStr) || 0;
      const total = habits.length || 1;
      const pct = Math.min(100, Math.round((completed / total) * 100));

      stats.set(dStr, { completed, total, pct });
      if (completed > 0) activeCount++;
      checksCount += completed;
    }

    return {
      days: intervalDays,
      statsByDate: stats,
      activeDays: activeCount,
      totalChecks: checksCount,
      maxStreak: 0,
    };
  }, [habits, records, daysCount]);

  const getColorClass = (pct: number) => {
    if (pct === 0) return "bg-muted/60 border-muted hover:border-foreground/30";
    if (pct < 30) return "bg-emerald-200 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800";
    if (pct < 65) return "bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600";
    if (pct < 90) return "bg-emerald-500 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400";
    return "bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300";
  };

  // Group days into weeks for column layout
  const weeks = useMemo(() => {
    const w: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === days.length - 1) {
        w.push(currentWeek);
        currentWeek = [];
      }
    });

    return w;
  }, [days]);

  // Day of week summary
  const dayOfWeekSummary = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const totalPossible = [0, 0, 0, 0, 0, 0, 0];

    days.forEach((d) => {
      const dayIdx = d.getDay();
      const dStr = format(d, "yyyy-MM-dd");
      const info = statsByDate.get(dStr);
      if (info) {
        counts[dayIdx] += info.completed;
        totalPossible[dayIdx] += info.total;
      }
    });

    return dayNames.map((name, i) => ({
      name,
      completed: counts[i],
      pct: totalPossible[i] > 0 ? Math.round((counts[i] / totalPossible[i]) * 100) : 0,
    }));
  }, [days, statsByDate]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Consistency Heatmap
            </CardTitle>
            <CardDescription>
              Habit completion intensity over the last {daysCount} days.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {totalChecks} checks
            </span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              {activeDays} active days
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <TooltipProvider delayDuration={100}>
            <div className="flex gap-1.5 min-w-[550px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((day) => {
                    const dStr = format(day, "yyyy-MM-dd");
                    const info = statsByDate.get(dStr) || { completed: 0, total: habits.length, pct: 0 };
                    return (
                      <Tooltip key={dStr}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setSelectedDay({ date: dStr, ...info })}
                            className={`h-3.5 w-3.5 rounded-sm border transition-transform hover:scale-125 focus:outline-none ${getColorClass(
                              info.pct
                            )}`}
                            aria-label={`${dStr}: ${info.completed} of ${info.total} habits (${info.pct}%)`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">{format(day, "EEE, MMM d, yyyy")}</p>
                          <p className="text-muted-foreground">
                            {info.completed} / {info.total} habits completed ({info.pct}%)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </TooltipProvider>

          {/* Scale Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-2 border-t">
            <span>Older</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div className="h-3 w-3 rounded-sm bg-muted border" />
              <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-950 border" />
              <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-700 border" />
              <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-500 border" />
              <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-400 border" />
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </div>

        {/* Day-of-week Consistency Breakdown */}
        <div className="border-t pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Day of Week Consistency
          </h4>
          <div className="grid grid-cols-7 gap-2 text-center">
            {dayOfWeekSummary.map((d) => (
              <div key={d.name} className="p-2 rounded-md bg-muted/40 border">
                <div className="text-xs font-medium">{d.name}</div>
                <div className="text-base font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {d.pct}%
                </div>
                <div className="text-[10px] text-muted-foreground">{d.completed} checks</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
