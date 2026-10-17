import type { DailyRecord, Habit } from "@/lib/data/habitStore";

/** Same rules as the original tracker: "do" = 1 pt when completed, "dont" = 1 pt when record exists and not completed, journal = 2 pts. */
export const calculateDayPoints = (
  habits: Pick<Habit, "id" | "type">[],
  dayRecords: DailyRecord[],
  hasJournal: boolean,
): number => {
  let points = 0;
  for (const habit of habits) {
    const record = dayRecords.find((r) => r.habit_id === habit.id);
    if (habit.type === "do" ? !!record?.completed : !!record && !record.completed) points += 1;
  }
  return points + (hasJournal ? 2 : 0);
};

export const maxDayPoints = (habitCount: number) => habitCount + 2;
