import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, LogOut, BarChart3, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/Calendar";
import { HabitList } from "@/components/HabitList";
import { JournalEntry } from "@/components/JournalEntry";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "@/lib/supabase";

interface Habit {
  id: string;
  name: string;
  type: "do" | "dont";
  is_active: boolean;
}

interface DailyRecord {
  habit_id: string;
  completed: boolean;
  record_date: string;
}

interface DayPoints {
  points: number;
  hasJournal: boolean;
}

const Dashboard = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyRecords, setDailyRecords] = useState<Map<string, DailyRecord[]>>(new Map());
  const [monthRecords, setMonthRecords] = useState<DailyRecord[]>([]);
  const [monthJournals, setMonthJournals] = useState<Map<string, boolean>>(new Map());
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set());
  const [journalContent, setJournalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth, habits]);

  useEffect(() => {
    loadDailyData(selectedDate);
  }, [selectedDate, habits]);

  const loadData = async () => {
    try {
      const { data: habitsData, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("is_active", true)
        .order("created_at");

      if (habitsError) throw habitsError;
      setHabits((habitsData as Habit[]) || []);
    } catch (error: any) {
      toast({
        description: "Failed to load habits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMonthData = async (date: Date) => {
    try {
      const monthStart = format(startOfMonth(date), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(date), "yyyy-MM-dd");

      const { data: recordsData, error: recordsError } = await supabase
        .from("daily_records")
        .select("*")
        .gte("record_date", monthStart)
        .lte("record_date", monthEnd);

      if (recordsError) throw recordsError;
      setMonthRecords(recordsData || []);

      const { data: journalData, error: journalError } = await supabase
        .from("journal_entries")
        .select("entry_date")
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd);

      if (journalError) throw journalError;
      const journalMap = new Map();
      (journalData || []).forEach((j) => journalMap.set(j.entry_date, true));
      setMonthJournals(journalMap);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: "Failed to load monthly records. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadDailyData = async (date: Date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");

      const { data: recordsData, error: recordsError } = await supabase
        .from("daily_records")
        .select("*")
        .eq("record_date", dateStr);

      if (recordsError) throw recordsError;

      // Auto-create records for "dont" habits with completed=true if they don't exist
      const { data: { user } } = await supabase.auth.getUser();
      if (user && habits.length > 0) {
        const existingHabitIds = new Set((recordsData || []).map(r => r.habit_id));
        const dontHabits = habits.filter(h => h.type === "dont" && !existingHabitIds.has(h.id));
        
        if (dontHabits.length > 0) {
          const newRecords = dontHabits.map(habit => ({
            user_id: user.id,
            record_date: dateStr,
            habit_id: habit.id,
            completed: true
          }));
          
          const { error: insertError } = await supabase
            .from("daily_records")
            .insert(newRecords);
          
          if (!insertError) {
            // Reload records to include newly created ones
            const { data: updatedRecords } = await supabase
              .from("daily_records")
              .select("*")
              .eq("record_date", dateStr);
            
            if (updatedRecords) {
              const completed = new Set(
                updatedRecords
                  .filter((r) => r.completed)
                  .map((r) => r.habit_id)
              );
              setCompletedHabits(completed);
              return;
            }
          }
        }
      }

      const completed = new Set(
        (recordsData || [])
          .filter((r) => r.completed)
          .map((r) => r.habit_id)
      );
      setCompletedHabits(completed);

      const { data: journalData, error: journalError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("entry_date", dateStr)
        .maybeSingle();

      if (journalError) throw journalError;
      setJournalContent(journalData?.content || "");
    } catch (error: any) {
      toast({
        description: "Failed to load daily data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleHabit = async (habitId: string) => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const isCompleted = completedHabits.has(habitId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from("daily_records")
        .upsert({
          user_id: user.id,
          record_date: dateStr,
          habit_id: habitId,
          completed: !isCompleted,
        }, {
          onConflict: "user_id,record_date,habit_id"
        });

      if (error) throw error;

      const newCompleted = new Set(completedHabits);
      if (isCompleted) {
        newCompleted.delete(habitId);
      } else {
        newCompleted.add(habitId);
      }
      setCompletedHabits(newCompleted);
    } catch (error: any) {
      toast({
        description: "Failed to update habit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddHabit = async (name: string, type: "do" | "dont") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("habits")
        .insert({ user_id: user.id, name, type })
        .select()
        .single();

      if (error) throw error;
      setHabits([...habits, data as Habit]);
      toast({ title: "Habit added successfully!" });
    } catch (error: any) {
      toast({
        description: "Failed to add habit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      const { error } = await supabase
        .from("habits")
        .update({ is_active: false })
        .eq("id", habitId);

      if (error) throw error;
      setHabits(habits.filter((h) => h.id !== habitId));
      toast({ title: "Habit deleted successfully!" });
    } catch (error: any) {
      toast({
        description: "Failed to delete habit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveJournal = async (content: string) => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("journal_entries")
        .upsert({
          user_id: user.id,
          entry_date: dateStr,
          content,
        }, {
          onConflict: "user_id,entry_date"
        });

      if (error) throw error;
      setJournalContent(content);
      toast({ title: "Journal saved successfully!" });
    } catch (error: any) {
      toast({
        description: "Failed to save journal entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const calculateDayPoints = (date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayRecords = monthRecords.filter((r) => r.record_date === dateStr);
    const hasJournal = monthJournals.has(dateStr);
    
    let points = 0;
    
    habits.forEach((habit) => {
      const record = dayRecords.find((r) => r.habit_id === habit.id);
      if (habit.type === "do") {
        if (record?.completed) points += 1;
      } else {
        // For "dont" habits, a point is earned when the habit was avoided (i.e., not completed)
        if (record && !record.completed) points += 1;
      }
    });
    
    if (hasJournal) points += 2;
    
    return points;
  };

  const getDayStatus = (date: Date): "success" | "failure" | "neutral" | "warning" => {
    if (isToday(date)) return "neutral";
    
    const maxPoints = habits.length + 2; // Each habit = 1 point, journal = 2 points
    if (maxPoints === 0) return "neutral";
    
    const points = calculateDayPoints(date);
    const percentage = (points / maxPoints) * 100;
    
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "warning";
    return "failure";
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const calculatePoints = () => {
    let points = 0;
    
    habits.forEach((habit) => {
      if (habit.type === "do") {
        if (completedHabits.has(habit.id)) {
          points += 1;
        }
      } else {
        // For "dont" habits, points are earned when NOT completed
        if (!completedHabits.has(habit.id)) {
          points += 1;
        }
      }
    });
    
    if (journalContent) points += 2;
    
    return points;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            HabitFlow
          </h1>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {format(currentMonth, "MMMM yyyy")}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Calendar
                  currentDate={currentMonth}
                  onDateClick={setSelectedDate}
                  getDayStatus={getDayStatus}
                  getDayPoints={calculateDayPoints}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Today's Points
                  </span>
                  <span className="text-3xl font-bold text-primary">{calculatePoints()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Completed Habits:</span>
                  <span>+{Array.from(completedHabits).length * 1}</span>
                </div>
                <div className="flex justify-between">
                  <span>Journal Entry:</span>
                  <span>+{journalContent ? 2 : 0}</span>
                </div>
                <div className="text-xs mt-2 opacity-70">
                  Each habit = 1 point • Journal = 2 points
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
              </CardHeader>
            </Card>

            <HabitList
              habits={habits}
              completedHabits={completedHabits}
              onToggleHabit={handleToggleHabit}
              onAddHabit={handleAddHabit}
              onDeleteHabit={handleDeleteHabit}
            />

            <JournalEntry
              date={selectedDate}
              content={journalContent}
              onSave={handleSaveJournal}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
