import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, BarChart3, Calendar as CalendarIcon, Home, DatabaseBackup } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/Calendar";
import { HabitList } from "@/components/HabitList";
import { JournalEntry } from "@/components/JournalEntry";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { HabitWiseAnalysis } from "@/components/analytics/HabitWiseAnalysis";
import { StreakDisplay } from "@/components/StreakDisplay";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { useStreak } from "@/hooks/useStreak";
import { useToast } from "@/hooks/use-toast";
import { getHabitStore, type DailyRecord, type Habit } from "@/lib/data/habitStore";
import { calculateDayPoints, maxDayPoints } from "@/lib/habitScoring";

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.name === "LocalStoreError" ? e.message : fallback);

/** Habit tracker backed by the on-device store (local mode). */
const LocalHabits = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [monthRecords, setMonthRecords] = useState<DailyRecord[]>([]);
  const [monthJournals, setMonthJournals] = useState<Set<string>>(new Set());
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set());
  const [journalContent, setJournalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentStreak, longestStreak, loading: streakLoading } = useStreak(habits);

  const fail = useCallback((e: unknown, fallback: string) => {
    console.error(e);
    toast({ description: errMsg(e, fallback), variant: "destructive" });
  }, [toast]);

  useEffect(() => {
    getHabitStore()
      .then((s) => s.listActiveHabits())
      .then(setHabits)
      .catch((e) => fail(e, "Failed to load habits."))
      .finally(() => setLoading(false));
  }, [fail]);

  useEffect(() => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    getHabitStore()
      .then((s) => Promise.all([s.listRecords(start, end), s.listJournalDates(start, end)]))
      .then(([records, dates]) => {
        setMonthRecords(records);
        setMonthJournals(new Set(dates));
      })
      .catch((e) => fail(e, "Failed to load monthly records."));
  }, [currentMonth, habits, refreshKey, fail]);

  useEffect(() => {
    const date = format(selectedDate, "yyyy-MM-dd");
    (async () => {
      const store = await getHabitStore();
      if (habits.length) await store.ensureDontRecords(date, habits);
      const [records, journal] = await Promise.all([store.listRecords(date, date), store.getJournal(date)]);
      setCompletedHabits(new Set(records.filter((r) => r.completed).map((r) => r.habit_id)));
      setJournalContent(journal);
    })().catch((e) => fail(e, "Failed to load daily data."));
  }, [selectedDate, habits, fail]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const handleToggleHabit = async (habitId: string) => {
    try {
      const done = completedHabits.has(habitId);
      await (await getHabitStore()).setRecord(dateStr, habitId, !done);
      const next = new Set(completedHabits);
      if (done) next.delete(habitId); else next.add(habitId);
      setCompletedHabits(next);
      setRefreshKey((k) => k + 1);
    } catch (e) { fail(e, "Failed to update habit."); }
  };

  const handleAddHabit = async (name: string, type: "do" | "dont") => {
    try {
      const habit = await (await getHabitStore()).addHabit(name, type);
      setHabits((h) => [...h, habit]);
      toast({ title: "Habit added successfully!" });
    } catch (e) { fail(e, "Failed to add habit."); }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      await (await getHabitStore()).archiveHabit(id);
      setHabits((h) => h.filter((x) => x.id !== id));
      toast({ title: "Habit deleted successfully!" });
    } catch (e) { fail(e, "Failed to delete habit."); }
  };

  const handleUpdate = (field: "name" | "notes") => async (id: string, value: string) => {
    try {
      await (await getHabitStore()).updateHabit(id, { [field]: value });
      setHabits((h) => h.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
      toast({ title: field === "name" ? "Habit renamed" : "Notes saved" });
    } catch (e) { fail(e, "Failed to update habit."); }
  };

  const handleSaveJournal = async (content: string) => {
    try {
      await (await getHabitStore()).saveJournal(dateStr, content);
      setJournalContent(content);
      setRefreshKey((k) => k + 1);
      toast({ title: "Journal saved successfully!" });
    } catch (e) { fail(e, "Failed to save journal entry."); }
  };

  const dayPoints = (date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    return calculateDayPoints(habits, monthRecords.filter((r) => r.record_date === d), monthJournals.has(d));
  };

  const getDayStatus = (date: Date): "success" | "failure" | "neutral" | "warning" => {
    if (isToday(date) || habits.length === 0) return "neutral";
    const pct = (dayPoints(date) / maxDayPoints(habits.length)) * 100;
    return pct >= 80 ? "success" : pct >= 60 ? "warning" : "failure";
  };

  const todayRecords: DailyRecord[] = habits.map((h) => ({ habit_id: h.id, record_date: dateStr, completed: completedHabits.has(h.id) }));
  const points = calculateDayPoints(habits, todayRecords, !!journalContent);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">HabitFlow</h1>
            <LocalModeBadge />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="LifeOS home"><Home className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/data")} title="Backup & restore"><DatabaseBackup className="h-5 w-5" /></Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-5 w-5" /></Button>
                  <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />{format(currentMonth, "MMMM yyyy")}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-5 w-5" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <Calendar currentDate={currentMonth} onDateClick={setSelectedDate} getDayStatus={getDayStatus} getDayPoints={dayPoints} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Day's Points</span>
                  <span className="text-3xl font-bold text-primary">{points}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Each habit = 1 point • Journal = 2 points</CardContent>
            </Card>

            <StreakDisplay currentStreak={currentStreak} longestStreak={longestStreak} loading={streakLoading} />
          </div>

          <div className="space-y-6">
            <Card><CardHeader><CardTitle>{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle></CardHeader></Card>
            <HabitList
              habits={habits}
              completedHabits={completedHabits}
              onToggleHabit={handleToggleHabit}
              onAddHabit={handleAddHabit}
              onDeleteHabit={handleDeleteHabit}
              onUpdateHabitNotes={handleUpdate("notes")}
              onUpdateHabitName={handleUpdate("name")}
            />
            <JournalEntry date={selectedDate} content={journalContent} onSave={handleSaveJournal} />
            <AnalyticsCharts habits={habits} key={`charts-${refreshKey}`} />
            <HabitWiseAnalysis habits={habits} key={`hw-${refreshKey}`} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LocalHabits;
