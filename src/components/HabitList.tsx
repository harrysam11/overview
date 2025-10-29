import { useState } from "react";
import { Check, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Habit {
  id: string;
  name: string;
  type: "do" | "dont";
  is_active: boolean;
}

interface HabitListProps {
  habits: Habit[];
  completedHabits: Set<string>;
  onToggleHabit: (habitId: string) => void;
  onAddHabit: (name: string, type: "do" | "dont") => void;
  onDeleteHabit: (habitId: string) => void;
}

export const HabitList = ({
  habits,
  completedHabits,
  onToggleHabit,
  onAddHabit,
  onDeleteHabit,
}: HabitListProps) => {
  const [newHabitName, setNewHabitName] = useState("");
  const [habitType, setHabitType] = useState<"do" | "dont">("do");

  const dos = habits.filter((h) => h.type === "do" && h.is_active);
  const donts = habits.filter((h) => h.type === "dont" && h.is_active);

  const handleAddHabit = () => {
    if (newHabitName.trim()) {
      onAddHabit(newHabitName.trim(), habitType);
      setNewHabitName("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Habit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={habitType === "do" ? "default" : "outline"}
              onClick={() => setHabitType("do")}
              className="flex-1"
            >
              Do's
            </Button>
            <Button
              type="button"
              variant={habitType === "dont" ? "destructive" : "outline"}
              onClick={() => setHabitType("dont")}
              className="flex-1"
            >
              Don'ts
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Exercise for 30 minutes"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddHabit()}
            />
            <Button onClick={handleAddHabit} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            Do's ({dos.filter((h) => completedHabits.has(h.id)).length}/{dos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dos.map((habit) => (
            <div
              key={habit.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                completedHabits.has(habit.id)
                  ? "bg-success/10 border-success"
                  : "bg-card hover:bg-muted/50"
              )}
            >
              <label className="flex items-center gap-3 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedHabits.has(habit.id)}
                  onChange={() => onToggleHabit(habit.id)}
                  className="w-5 h-5 rounded accent-primary cursor-pointer"
                />
                <span className={cn(completedHabits.has(habit.id) && "line-through opacity-70")}>
                  {habit.name}
                </span>
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteHabit(habit.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {dos.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No Do's added yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-destructive" />
            Don'ts ({donts.filter((h) => !completedHabits.has(h.id)).length}/{donts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {donts.map((habit) => (
            <div
              key={habit.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                !completedHabits.has(habit.id)
                  ? "bg-success/10 border-success"
                  : "bg-destructive/10 border-destructive"
              )}
            >
              <label className="flex items-center gap-3 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completedHabits.has(habit.id)}
                  onChange={() => onToggleHabit(habit.id)}
                  className="w-5 h-5 rounded accent-destructive cursor-pointer"
                />
                <span className={cn(completedHabits.has(habit.id) && "line-through opacity-70")}>
                  {habit.name}
                </span>
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteHabit(habit.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {donts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No Don'ts added yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
