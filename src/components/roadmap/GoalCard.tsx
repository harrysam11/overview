import { useState } from "react";
import { format } from "date-fns";
import { Target, Plus, Trash2, CheckCircle2, Circle, CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Goal } from "@/hooks/useGoalRoadmap";

interface GoalCardProps {
  goal: Goal;
  onUpdateGoal: (id: string, updates: any) => void;
  onDeleteGoal: (id: string) => void;
  onAddMilestone: (goalId: string, title: string) => void;
  onToggleMilestone: (id: string, completed: boolean) => void;
  onDeleteMilestone: (id: string) => void;
}

export const GoalCard = ({ goal, onUpdateGoal, onDeleteGoal, onAddMilestone, onToggleMilestone, onDeleteMilestone }: GoalCardProps) => {
  const [newMilestone, setNewMilestone] = useState("");
  const [expanded, setExpanded] = useState(true);

  const completed = goal.milestones.filter(m => m.is_completed).length;
  const total = goal.milestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusColor = goal.status === "completed" ? "default" : goal.status === "active" ? "secondary" : "outline";

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return;
    onAddMilestone(goal.id, newMilestone.trim());
    setNewMilestone("");
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <Target className="h-5 w-5 text-primary shrink-0" />
              <CardTitle className="text-lg truncate">{goal.title}</CardTitle>
              <Badge variant={statusColor} className="capitalize shrink-0">{goal.status}</Badge>
            </div>
            {goal.description && <p className="text-sm text-muted-foreground ml-14">{goal.description}</p>}
            {goal.target_date && (
              <p className="text-xs text-muted-foreground ml-14 flex items-center gap-1 mt-1">
                <CalendarDays className="h-3 w-3" /> Target: {format(new Date(goal.target_date), "MMM d, yyyy")}
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {goal.status === "active" && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateGoal(goal.id, { status: "completed" })}>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteGoal(goal.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {total > 0 && (
          <div className="ml-14 mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{completed}/{total} milestones</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 ml-14 space-y-2">
          {goal.milestones.map(m => (
            <div key={m.id} className="flex items-center gap-2 group">
              <button onClick={() => onToggleMilestone(m.id, m.is_completed)} className="shrink-0">
                {m.is_completed
                  ? <CheckCircle2 className="h-4 w-4 text-primary" />
                  : <Circle className="h-4 w-4 text-muted-foreground" />}
              </button>
              <span className={`text-sm flex-1 ${m.is_completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDeleteMilestone(m.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Input placeholder="Add milestone..." value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddMilestone()} className="h-8 text-sm" />
            <Button size="sm" variant="outline" className="h-8" onClick={handleAddMilestone} disabled={!newMilestone.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
