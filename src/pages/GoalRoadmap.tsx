import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoalCard } from "@/components/roadmap/GoalCard";
import { useGoalRoadmap } from "@/hooks/useGoalRoadmap";

const GoalRoadmap = () => {
  const navigate = useNavigate();
  const { goals, loading, addGoal, updateGoal, deleteGoal, addMilestone, toggleMilestone, deleteMilestone } = useGoalRoadmap();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    addGoal(title.trim(), description.trim(), targetDate || undefined);
    setTitle(""); setDescription(""); setTargetDate(""); setShowForm(false);
  };

  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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
              <Target className="h-6 w-6 text-primary" /> Goal Roadmap
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Goal
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Create New Goal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Goal title" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={!title.trim()}>Add Goal</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeGoals.length === 0 && completedGoals.length === 0 && !showForm && (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No goals yet</p>
            <p className="text-sm">Create your first goal to start your roadmap!</p>
          </div>
        )}

        {activeGoals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">Active Goals</h2>
            {activeGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdateGoal={updateGoal} onDeleteGoal={deleteGoal}
                onAddMilestone={addMilestone} onToggleMilestone={toggleMilestone} onDeleteMilestone={deleteMilestone} />
            ))}
          </div>
        )}

        {completedGoals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">Completed Goals</h2>
            {completedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdateGoal={updateGoal} onDeleteGoal={deleteGoal}
                onAddMilestone={addMilestone} onToggleMilestone={toggleMilestone} onDeleteMilestone={deleteMilestone} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GoalRoadmap;
