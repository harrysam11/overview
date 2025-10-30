import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  getDayStatus: (date: Date) => "success" | "failure" | "neutral" | "warning";
  getDayPoints: (date: Date) => number;
}

export const Calendar = ({ currentDate, onDateClick, getDayStatus, getDayPoints }: CalendarProps) => {
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
          const points = getDayPoints(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrent = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={cn(
                "aspect-square rounded-lg p-1 text-sm font-medium transition-all hover:scale-105",
                "flex flex-col items-center justify-center relative gap-0.5",
                !isCurrentMonth && "opacity-40",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                status === "success" && "bg-success text-success-foreground hover:bg-success/90",
                status === "warning" && "bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90",
                status === "failure" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                status === "neutral" && "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              <span>{format(day, "d")}</span>
              {points > 0 && (
                <span className="text-[10px] font-bold opacity-90">{points}p</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
