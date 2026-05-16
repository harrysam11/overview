import { useState } from "react";
import { Check, X, Plus, Trash2, FileText, FolderOpen, Pencil } from "lucide-react";
import { HabitWorkspaceDialog } from "@/components/workspace/HabitWorkspaceDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { habitNameSchema, habitNotesSchema } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";

interface Habit {
  id: string;
  name: string;
  type: "do" | "dont";
  is_active: boolean;
  notes?: string | null;
}

interface HabitListProps {
  habits: Habit[];
  completedHabits: Set<string>;
  onToggleHabit: (habitId: string) => void;
  onAddHabit: (name: string, type: "do" | "dont") => void;
  onDeleteHabit: (habitId: string) => void;
  onUpdateHabitNotes: (habitId: string, notes: string) => void;
}

export const HabitList = ({
  habits,
  completedHabits,
  onToggleHabit,
  onAddHabit,
  onDeleteHabit,
  onUpdateHabitNotes,
}: HabitListProps) => {
  const [newHabitName, setNewHabitName] = useState("");
  const [habitType, setHabitType] = useState<"do" | "dont">("do");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [notesContent, setNotesContent] = useState("");
  const [workspaceHabit, setWorkspaceHabit] = useState<Habit | null>(null);
  const { toast } = useToast();

  const openNotesDialog = (habit: Habit) => {
    setSelectedHabit(habit);
    setNotesContent(habit.notes || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    if (selectedHabit) {
      const validation = habitNotesSchema.safeParse(notesContent);
      if (!validation.success) {
        toast({
          title: "Invalid notes",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
      onUpdateHabitNotes(selectedHabit.id, validation.data || "");
      setNotesDialogOpen(false);
      setSelectedHabit(null);
      setNotesContent("");
    }
  };

  const dos = habits.filter((h) => h.type === "do" && h.is_active);
  const donts = habits.filter((h) => h.type === "dont" && h.is_active);

  const handleAddHabit = () => {
    const trimmedName = newHabitName.trim();
    
    const validation = habitNameSchema.safeParse(trimmedName);
    if (!validation.success) {
      toast({
        title: "Invalid habit name",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    onAddHabit(validation.data, habitType);
    setNewHabitName("");
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
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWorkspaceHabit(habit)}
                  className="text-muted-foreground hover:text-primary"
                  title="Workspace"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openNotesDialog(habit)}
                  className="text-muted-foreground hover:text-primary"
                >
                  {habit.notes ? <FileText className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteHabit(habit.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWorkspaceHabit(habit)}
                  className="text-muted-foreground hover:text-primary"
                  title="Workspace"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openNotesDialog(habit)}
                  className="text-muted-foreground hover:text-primary"
                >
                  {habit.notes ? <FileText className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteHabit(habit.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {donts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No Don'ts added yet</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedHabit?.notes ? "Edit" : "Add"} Reminder Note
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Textarea
              placeholder="Write your reminder or description here..."
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              className="min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notesContent.length}/1000 characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSaveNotes}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HabitWorkspaceDialog
        habitId={workspaceHabit?.id ?? null}
        habitName={workspaceHabit?.name ?? ""}
        open={!!workspaceHabit}
        onOpenChange={(o) => !o && setWorkspaceHabit(null)}
      />
    </div>
  );
};
