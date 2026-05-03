import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Target, TrendingUp, TrendingDown } from "lucide-react";

interface Habit {
  id: string;
  name: string;
  type: "do" | "dont";
}

interface HabitStat {
  id: string;
  name: string;
  type: "do" | "dont";
  successDays: number;
  totalDays: number;
  successRate: number;
}

interface HabitWiseAnalysisProps {
  habits: Habit[];
}

const RANGES = [
  { key: "7", label: "7 Days", days: 7 },
  { key: "30", label: "30 Days", days: 30 },
  { key: "90", label: "90 Days", days: 90 },
] as const;

export function HabitWiseAnalysis({ habits }: HabitWiseAnalysisProps) {
  const [records, setRecords] = useState<Array<{ habit_id: string; record_date: string; completed: boolean | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7");

  useEffect(() => {
    const load = async () => {
      if (habits.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const today = new Date();
        const start = subDays(today, 89); // load enough for the largest range
        const { data } = await supabase
          .from("daily_records")
          .select("habit_id, record_date, completed")
          .gte("record_date", format(start, "yyyy-MM-dd"))
          .lte("record_date", format(today, "yyyy-MM-dd"));
        setRecords(data || []);
      } catch (err) {
        console.error("Error loading habit-wise analysis:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [habits]);

  const stats: HabitStat[] = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? 7;
    const today = new Date();
    const start = subDays(today, days - 1);
    const startStr = format(start, "yyyy-MM-dd");

    return habits.map((habit) => {
      const habitRecords = records.filter(
        (r) => r.habit_id === habit.id && r.record_date >= startStr
      );

      let successDays = 0;
      if (habit.type === "do") {
        successDays = habitRecords.filter((r) => r.completed === true).length;
      } else {
        // "Don't" habits are completed by default. A success day is one where
        // there's no record OR the record is not marked completed (i.e. user didn't slip).
        const slipDays = habitRecords.filter((r) => r.completed === true).length;
        successDays = days - slipDays;
      }

      const successRate = days > 0 ? Math.round((successDays / days) * 100) : 0;

      return {
        id: habit.id,
        name: habit.name,
        type: habit.type,
        successDays,
        totalDays: days,
        successRate,
      };
    });
  }, [habits, records, range]);

  const sorted = useMemo(
    () => [...stats].sort((a, b) => b.successRate - a.successRate),
    [stats]
  );

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          Add habits to see per-habit analysis
        </CardContent>
      </Card>
    );
  }

  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-success";
    if (rate >= 60) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Habit-wise Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList className="grid w-full grid-cols-3">
            {RANGES.map((r) => (
              <TabsTrigger key={r.key} value={r.key}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {RANGES.map((r) => (
            <TabsContent key={r.key} value={r.key} className="space-y-4 mt-4">
              {best && worst && best.id !== worst.id && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 bg-card">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-success" />
                      Doing well
                    </div>
                    <div className="font-semibold truncate">{best.name}</div>
                    <div className={`text-sm ${getRateColor(best.successRate)}`}>
                      {best.successRate}% success
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 bg-card">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      Needs focus
                    </div>
                    <div className="font-semibold truncate">{worst.name}</div>
                    <div className={`text-sm ${getRateColor(worst.successRate)}`}>
                      {worst.successRate}% success
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {sorted.map((s) => (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {s.type === "do" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <span className="text-sm font-medium truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[10px] py-0 h-4 capitalize">
                          {s.type === "do" ? "Do" : "Don't"}
                        </Badge>
                      </div>
                      <div className={`text-sm font-semibold tabular-nums ${getRateColor(s.successRate)}`}>
                        {s.successRate}%
                      </div>
                    </div>
                    <Progress value={s.successRate} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {s.type === "do"
                        ? `Completed ${s.successDays} of ${s.totalDays} days`
                        : `Avoided ${s.successDays} of ${s.totalDays} days`}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
