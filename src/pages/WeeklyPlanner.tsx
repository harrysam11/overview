import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Trash2, Loader2, CalendarDays, CheckCircle2, Circle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWeeklyPlanner } from "@/hooks/useWeeklyPlanner";
import { cn } from "@/lib/utils";

const priorityConfig = {
  high: { label: "High", color: "text-destructive", icon: "🔴" },
  medium: { label: "Medium", color: "text-yellow-500", icon: "🟡" },
  low: { label: "Low", color: "text-green-500", icon: "🟢" },
};

const WeeklyPlanner = () => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { plans, loading, addPlan, togglePlan, deletePlan, weekStart, completedCount, progress } = useWeeklyPlanner(currentWeek);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");

  const weekEnd = endOfWeek(startOfWeek(currentWeek, { weekStartsOn: 1 }), { weekStartsOn: 1 });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addPlan(newTitle.trim(), newPriority);
    setNewTitle("");
    setNewPriority("medium");
    setAdding(false);
  };

  const sortedPlans = [...plans].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Weekly Planner
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Week Navigation */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">
                  {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedCount} of {plans.length} completed
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            {plans.length > 0 && <Progress value={progress} className="mt-3 h-2" />}
          </CardContent>
        </Card>

        {/* Plans List */}
        <div className="space-y-2 mb-4">
          {sortedPlans.map(plan => (
            <Card key={plan.id} className={cn("transition-opacity", plan.is_completed && "opacity-60")}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <button onClick={() => togglePlan(plan.id)} className="shrink-0">
                  {plan.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <span className={cn("flex-1 text-sm", plan.is_completed && "line-through text-muted-foreground")}>
                  {plan.title}
                </span>
                <span className="text-xs shrink-0">{priorityConfig[plan.priority].icon}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deletePlan(plan.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Plan */}
        {adding ? (
          <Card>
            <CardContent className="py-3 px-4 space-y-3">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What's your intention for this week?"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              />
              <div className="flex items-center gap-2">
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleAdd}>Add</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" className="w-full border-dashed text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add weekly intention
          </Button>
        )}

        {plans.length === 0 && !adding && (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No plans for this week</p>
            <p className="text-sm mt-1">Set your weekly intentions to stay focused!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default WeeklyPlanner;
