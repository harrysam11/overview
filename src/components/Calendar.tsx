import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  getDayStatus: (date: Date) => "success" | "failure" | "neutral";
}

export const Calendar = ({ currentDate, onDateClick, getDayStatus }: CalendarProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const emptyDays = Array(startDay).fill(null);
    return [...emptyDays, ...days];
  }, [monthStart, monthEnd]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const status = getDayStatus(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrent = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={cn(
                "aspect-square rounded-lg p-2 text-sm font-medium transition-all hover:scale-105",
                "flex items-center justify-center relative",
                !isCurrentMonth && "opacity-40",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                status === "success" && "bg-success text-success-foreground hover:bg-success/90",
                status === "failure" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                status === "neutral" && "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
};
