import { useState, useEffect } from "react";
import { format, subDays, parseISO, isAfter, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Habit {
  id: string;
  type: "do" | "dont";
}

interface DailyRecord {
  habit_id: string;
  completed: boolean;
  record_date: string;
}

export const useStreak = (habits: Habit[]) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (habits.length === 0) {
      setLoading(false);
      return;
    }
    calculateStreak();
  }, [habits]);

  const calculateDayPoints = (
    records: DailyRecord[],
    journals: Set<string>,
    dateStr: string,
    habitsForDay: Habit[]
  ): number => {
    const dayRecords = records.filter((r) => r.record_date === dateStr);
    const hasJournal = journals.has(dateStr);
    
    let points = 0;
    
    habitsForDay.forEach((habit) => {
      const record = dayRecords.find((r) => r.habit_id === habit.id);
      if (habit.type === "do") {
        if (record?.completed) points += 1;
      } else {
        if (record && !record.completed) points += 1;
      }
    });
    
    if (hasJournal) points += 2;
    
    return points;
  };

  const calculateStreak = async () => {
    try {
      const today = startOfDay(new Date());
      const lookbackDays = 365; // Look back up to 1 year
      const startDate = format(subDays(today, lookbackDays), "yyyy-MM-dd");
      const endDate = format(subDays(today, 1), "yyyy-MM-dd"); // Start from yesterday

      // Fetch all records for the lookback period
      const { data: recordsData, error: recordsError } = await supabase
        .from("daily_records")
        .select("*")
        .gte("record_date", startDate)
        .lte("record_date", endDate);

      if (recordsError) throw recordsError;

      // Fetch all journal entries for the lookback period
      const { data: journalData, error: journalError } = await supabase
        .from("journal_entries")
        .select("entry_date")
        .gte("entry_date", startDate)
        .lte("entry_date", endDate);

      if (journalError) throw journalError;

      const journals = new Set<string>(
        (journalData || []).map((j) => j.entry_date)
      );

      // Calculate streaks
      let current = 0;
      let longest = 0;
      let tempStreak = 0;
      let streakBroken = false;

      // Go backwards from yesterday
      for (let i = 1; i <= lookbackDays; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, "yyyy-MM-dd");
        
        const maxPoints = habits.length + 2; // Each habit = 1 point, journal = 2 points
        const points = calculateDayPoints(recordsData || [], journals, dateStr, habits);
        const percentage = maxPoints > 0 ? (points / maxPoints) * 100 : 0;

        if (percentage >= 80) {
          tempStreak++;
          if (!streakBroken) {
            current = tempStreak;
          }
          if (tempStreak > longest) {
            longest = tempStreak;
          }
        } else {
          streakBroken = true;
          tempStreak = 0;
        }
      }

      setCurrentStreak(current);
      setLongestStreak(longest);
    } catch (error) {
      console.error("Error calculating streak:", error);
    } finally {
      setLoading(false);
    }
  };

  return { currentStreak, longestStreak, loading, refreshStreak: calculateStreak };
};
