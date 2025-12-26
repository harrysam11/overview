import { useCallback } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Challenge, ChallengeGoalType } from "@/hooks/useChallenges";

interface DailyRecord {
  habit_id: string;
  completed: boolean;
  record_date: string;
}

interface JournalEntry {
  entry_date: string;
}

export const useChallengeProgress = () => {
  const { toast } = useToast();

  const calculateProgress = useCallback(async (
    challenge: Challenge,
    userId: string
  ): Promise<number> => {
    const startDate = parseISO(challenge.start_date);
    const endDate = parseISO(challenge.end_date);
    const today = startOfDay(new Date());
    
    // Calculate effective end date (either end_date or today, whichever is earlier)
    const effectiveEnd = endDate > today ? today : endDate;
    
    // Only calculate if we're within or past the challenge period
    if (today < startDate) {
      return 0;
    }

    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(effectiveEnd, "yyyy-MM-dd");

    try {
      let progress = 0;

      switch (challenge.goal_type) {
        case "points": {
          // Points = completed habits (1pt each) + journal entries (2pts each)
          const { data: records } = await supabase
            .from("daily_records")
            .select("*")
            .eq("user_id", userId)
            .gte("record_date", startStr)
            .lte("record_date", endStr)
            .eq("completed", true);

          const { data: journals } = await supabase
            .from("journal_entries")
            .select("entry_date")
            .eq("user_id", userId)
            .gte("entry_date", startStr)
            .lte("entry_date", endStr);

          const habitPoints = records?.length || 0;
          const journalPoints = (journals?.length || 0) * 2;
          progress = habitPoints + journalPoints;
          break;
        }

        case "streak_days": {
          // Count consecutive days with at least 80% completion
          const { data: records } = await supabase
            .from("daily_records")
            .select("*")
            .eq("user_id", userId)
            .gte("record_date", startStr)
            .lte("record_date", endStr);

          const { data: journals } = await supabase
            .from("journal_entries")
            .select("entry_date")
            .eq("user_id", userId)
            .gte("entry_date", startStr)
            .lte("entry_date", endStr);

          const { data: habits } = await supabase
            .from("habits")
            .select("id, type")
            .eq("user_id", userId)
            .eq("is_active", true);

          if (!habits || habits.length === 0) {
            progress = 0;
            break;
          }

          const journalDates = new Set(journals?.map(j => j.entry_date) || []);
          const recordsByDate = new Map<string, DailyRecord[]>();
          
          (records || []).forEach(r => {
            const existing = recordsByDate.get(r.record_date) || [];
            existing.push(r);
            recordsByDate.set(r.record_date, existing);
          });

          let streakDays = 0;
          let currentDate = startDate;
          
          while (currentDate <= effectiveEnd) {
            const dateStr = format(currentDate, "yyyy-MM-dd");
            const dayRecords = recordsByDate.get(dateStr) || [];
            const hasJournal = journalDates.has(dateStr);
            
            let dayPoints = 0;
            habits.forEach(habit => {
              const record = dayRecords.find(r => r.habit_id === habit.id);
              if (habit.type === "do" && record?.completed) dayPoints++;
              if (habit.type === "dont" && record && !record.completed) dayPoints++;
            });
            if (hasJournal) dayPoints += 2;
            
            const maxPoints = habits.length + 2;
            const percentage = (dayPoints / maxPoints) * 100;
            
            if (percentage >= 80) {
              streakDays++;
            }
            
            currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
          }
          
          progress = streakDays;
          break;
        }

        case "habits_completed": {
          // Count total completed habits
          const { data: records } = await supabase
            .from("daily_records")
            .select("*")
            .eq("user_id", userId)
            .gte("record_date", startStr)
            .lte("record_date", endStr)
            .eq("completed", true);

          progress = records?.length || 0;
          break;
        }
      }

      return progress;
    } catch (error) {
      console.error("Error calculating progress:", error);
      return 0;
    }
  }, []);

  const syncAllProgress = useCallback(async (
    challenges: Challenge[],
    userId: string
  ) => {
    try {
      for (const challenge of challenges) {
        const progress = await calculateProgress(challenge, userId);
        
        await supabase
          .from("challenge_participants")
          .update({ progress })
          .eq("challenge_id", challenge.id)
          .eq("user_id", userId);
      }
    } catch (error: any) {
      console.error("Error syncing progress:", error);
      toast({
        description: "Failed to sync challenge progress",
        variant: "destructive",
      });
    }
  }, [calculateProgress, toast]);

  return {
    calculateProgress,
    syncAllProgress,
  };
};
