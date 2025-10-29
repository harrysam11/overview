import { useState, useEffect } from "react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
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
}

const Dashboard = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyRecords, setDailyRecords] = useState<Map<string, DailyRecord[]>>(new Map());
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set());
  const [journalContent, setJournalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

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
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      console.error("Error loading daily data:", error);
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
        title: "Error updating habit",
        description: error.message,
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
        title: "Error adding habit",
        description: error.message,
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
        title: "Error deleting habit",
        description: error.message,
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
        title: "Error saving journal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDayStatus = (date: Date): "success" | "failure" | "neutral" => {
    const dateStr = format(date, "yyyy-MM-dd");
    // Simplified status - you can enhance this later
    return "neutral";
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const calculatePoints = () => {
    const dos = habits.filter((h) => h.type === "do");
    const donts = habits.filter((h) => h.type === "dont");
    
    const completedDos = dos.filter((h) => completedHabits.has(h.id)).length;
    const avoidedDonts = donts.filter((h) => !completedHabits.has(h.id)).length;
    const journalPoints = journalContent ? 2 : 0;
    
    return (completedDos * 4) + (avoidedDonts * 4) + journalPoints;
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
                  <span>Completed Do's:</span>
                  <span>+{habits.filter((h) => h.type === "do" && completedHabits.has(h.id)).length * 4}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avoided Don'ts:</span>
                  <span>+{habits.filter((h) => h.type === "dont" && !completedHabits.has(h.id)).length * 4}</span>
                </div>
                <div className="flex justify-between">
                  <span>Journal Entry:</span>
                  <span>+{journalContent ? 2 : 0}</span>
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
