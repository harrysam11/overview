import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  DollarSign,
  Flame,
  HeartPulse,
  Lightbulb,
  ListTodo,
  Plus,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Users,
  WalletCards,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { useStreak } from "@/hooks/useStreak";
import { getHabitStore } from "@/lib/data/habitStore";
import { isLocalMode } from "@/lib/appMode";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { useToast } from "@/hooks/use-toast";
import { newId } from "@/lib/local/localDb";
import { localProjectSchema, localTaskSchema } from "@/lib/local/schema";
import { LocalVaultError, readVaultData, updateVaultData, validateLifeOsEntry } from "@/lib/local/vault";

type LocalTask = { id: string; title: string; done: boolean };
type LocalProject = { id: string; title: string; area: string };
const TASKS_KEY = "habitflow-lifeos-tasks";
const PROJECTS_KEY = "habitflow-lifeos-projects";

const readCloudModeList = <T,>(key: string, schema: z.ZodType<T>): T[] => {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const valid = schema.safeParse(item);
      return valid.success ? [valid.data] : [];
    });
  } catch {
    return [];
  }
};

const areas = [
  { id: "tasks", label: "Tasks", icon: ListTodo, description: "Keep today moving" },
  { id: "focus", label: "Focus", icon: TimerReset, description: "Protect deep work" },
  { id: "projects", label: "Projects", icon: BriefcaseBusiness, description: "Move work forward" },
  { id: "finance", label: "Finance", icon: WalletCards, description: "Stay money-aware" },
  { id: "health", label: "Health", icon: HeartPulse, description: "Care for your energy" },
  { id: "learning", label: "Learning", icon: Brain, description: "Build your edge" },
];

const LifeOS = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newProject, setNewProject] = useState("");
  const [habits, setHabits] = useState<{ id: string; type: "do" | "dont" }[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusRunning, setFocusRunning] = useState(false);

  useEffect(() => {
    if (!isLocalMode) {
      setTasks(readCloudModeList<LocalTask>(TASKS_KEY, localTaskSchema));
      setProjects(readCloudModeList<LocalProject>(PROJECTS_KEY, localProjectSchema));
      return;
    }
    let mounted = true;
    readVaultData()
      .then((data) => {
        if (!mounted) return;
        setTasks(data.tasks);
        setProjects(data.projects);
      })
      .catch((error) => {
        console.error("Unable to restore LifeOS workspace", error);
        toast({ description: error instanceof LocalVaultError ? error.message : "Could not load your saved LifeOS data.", variant: "destructive" });
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    getHabitStore()
      .then((store) => store.listActiveHabits())
      .then((data) => setHabits(data.map(({ id, type }) => ({ id, type }))))
      .catch((error) => console.error("Unable to load habits for LifeOS", error));
  }, []);

  const { currentStreak, longestStreak } = useStreak(habits);
  const completedTasks = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
  const today = format(new Date(), "EEEE, MMMM d");
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    try {
      const task = validateLifeOsEntry({ id: newId(), title, done: false }, "task");
      if (isLocalMode) {
        const updated = await updateVaultData((data) => ({ ...data, tasks: [...data.tasks, task] }));
        setTasks(updated.tasks);
      } else {
        const updated = [...tasks, task];
        window.localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
        setTasks(updated);
      }
      setNewTask("");
    } catch (error) {
      toast({ description: error instanceof Error ? error.message : "Could not add task.", variant: "destructive" });
    }
  };

  const addProject = async () => {
    const title = newProject.trim();
    if (!title) return;
    try {
      const project = validateLifeOsEntry({ id: newId(), title, area: "Personal" }, "project");
      if (isLocalMode) {
        const updated = await updateVaultData((data) => ({ ...data, projects: [...data.projects, project] }));
        setProjects(updated.projects);
      } else {
        const updated = [...projects, project];
        window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        setProjects(updated);
      }
      setNewProject("");
    } catch (error) {
      toast({ description: error instanceof Error ? error.message : "Could not add project.", variant: "destructive" });
    }
  };

  const toggleTask = async (id: string) => {
    try {
      if (isLocalMode) {
        const updated = await updateVaultData((data) => ({ ...data, tasks: data.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }));
        setTasks(updated.tasks);
      } else {
        const updated = tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task);
        window.localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
        setTasks(updated);
      }
    } catch (error) {
      toast({ description: error instanceof Error ? error.message : "Could not update task.", variant: "destructive" });
    }
  };

  const focusLabel = useMemo(() => focusRunning ? "Focus session active" : "Ready when you are", [focusRunning]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <button className="flex items-center gap-2 text-left" onClick={() => navigate("/dashboard")} aria-label="Open LifeOS home">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Flame className="h-4 w-4" /></span>
            <span className="font-semibold tracking-tight">HabitFlow <span className="font-normal text-muted-foreground">LifeOS</span></span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="secondary" size="sm" onClick={() => navigate("/dashboard")}>Overview</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/habits")}>Habits</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/notes")}>Notes</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/finance")}>Finance</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/files")}>Files</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/planner")}>Planner</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/roadmap")}>Goals</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/diary")}>Diary</Button>
          </nav>
          <div className="flex items-center gap-2">
            {isLocalMode && <LocalModeBadge />}
            <InstallAppDialog
              trigger={
                <Button variant="ghost" size="sm" className="gap-1.5 hidden lg:flex text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Install App
                </Button>
              }
            />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => navigate("/habits")}>Open tracker <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" /> {today}</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{greeting}. Make today count.</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">Your life, in one calm place. See what matters, choose your next move, and keep the important things moving.</p>
          </div>
          <Button onClick={() => navigate("/habits")} className="w-fit"><Plus className="mr-2 h-4 w-4" /> Log today</Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Today’s focus</p><p className="mt-1 text-2xl font-semibold">{completedTasks}/{tasks.length || 0}</p></div><ListTodo className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Current streak</p><p className="mt-1 text-2xl font-semibold">{currentStreak} days</p></div><Flame className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Longest streak</p><p className="mt-1 text-2xl font-semibold">{longestStreak} days</p></div><Trophy className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Active projects</p><p className="mt-1 text-2xl font-semibold">{projects.length}</p></div><BriefcaseBusiness className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Today’s command center</CardTitle><CardDescription>Small actions that keep the bigger picture clear.</CardDescription></div><Button variant="ghost" size="sm" onClick={() => navigate("/planner")}>Plan week <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Daily progress</span><span className="font-medium">{Math.round(progress)}%</span></div>
              <Progress value={progress} className="h-2" />
              <div className="space-y-2">
                {tasks.map((task) => <div key={task.id} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleTask(task.id)} aria-label={task.done ? "Mark task incomplete" : "Mark task complete"}>{task.done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}</Button><span className={task.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>{task.title}</span></div>)}
              </div>
              <div className="flex gap-2"><Input value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTask(); }} placeholder="Add a task for today" aria-label="Add a task for today" /><Button size="icon" onClick={addTask} aria-label="Add task"><Plus className="h-4 w-4" /></Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" /> Focus</CardTitle><CardDescription>{focusLabel}</CardDescription></CardHeader>
            <CardContent className="space-y-5"><div className="flex items-end gap-2"><span className="text-5xl font-semibold tracking-tight">{focusMinutes}</span><span className="mb-2 text-muted-foreground">minutes</span></div><div className="flex gap-2"><Button variant={focusRunning ? "secondary" : "default"} onClick={() => setFocusRunning((running) => !running)}>{focusRunning ? "Pause session" : "Start focus"}</Button><Button variant="outline" onClick={() => { setFocusRunning(false); setFocusMinutes(25); }}><TimerReset className="mr-2 h-4 w-4" />Reset</Button></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setFocusMinutes(15)}>15m</Button><Button variant="ghost" size="sm" onClick={() => setFocusMinutes(25)}>25m</Button><Button variant="ghost" size="sm" onClick={() => setFocusMinutes(50)}>50m</Button></div></CardContent>
          </Card>
        </div>

        <section>
          <div className="mb-4 flex items-end justify-between"><div><h2 className="text-2xl font-semibold tracking-tight">Your life areas</h2><p className="mt-1 text-sm text-muted-foreground">Everything has a place. Start with the area that needs your attention.</p></div><Button variant="ghost" size="sm" onClick={() => navigate("/ideas")}>Capture an idea <Lightbulb className="ml-2 h-4 w-4" /></Button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map(({ id, label, icon: Icon, description }) => <Card key={id} className="group cursor-pointer transition-colors hover:border-foreground/30" onClick={() => { if (id === "tasks") navigate("/planner"); if (id === "projects") navigate("/roadmap"); if (id === "finance") navigate("/finance"); if (id === "learning") navigate("/notes"); }}><CardContent className="flex items-center gap-4 p-5"><span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50"><Icon className="h-5 w-5" /></span><span className="flex-1"><span className="block font-medium">{label}</span><span className="block text-sm text-muted-foreground">{description}</span></span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></CardContent></Card>)}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Projects in motion</CardTitle><CardDescription>A simple view of what you are building.</CardDescription></div><Button variant="ghost" size="sm" onClick={() => navigate("/roadmap")}>Open goals <Target className="ml-2 h-4 w-4" /></Button></CardHeader><CardContent className="space-y-3">{projects.map((project) => <div key={project.id} className="flex items-center gap-3 rounded-md border border-border p-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted"><BriefcaseBusiness className="h-4 w-4" /></span><span className="flex-1"><span className="block text-sm font-medium">{project.title}</span><span className="block text-xs text-muted-foreground">{project.area}</span></span><BarChart3 className="h-4 w-4 text-muted-foreground" /></div>)}<div className="flex gap-2 pt-1"><Input value={newProject} onChange={(event) => setNewProject(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addProject(); }} placeholder="Add a project" aria-label="Add a project" /><Button size="icon" variant="outline" onClick={addProject} aria-label="Add project"><Plus className="h-4 w-4" /></Button></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Keep the whole picture close</CardTitle><CardDescription>Jump into the tools that already help you live intentionally.</CardDescription></CardHeader><CardContent><Tabs defaultValue="reflect"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="reflect">Reflect</TabsTrigger><TabsTrigger value="plan">Plan</TabsTrigger><TabsTrigger value="ideas">Ideas</TabsTrigger></TabsList><TabsContent value="reflect" className="space-y-3"><Button variant="outline" className="w-full justify-between" onClick={() => navigate("/diary")}>Universal diary <BookOpen className="h-4 w-4" /></Button><Button variant="outline" className="w-full justify-between" onClick={() => navigate("/habits")}>Habit insights <BarChart3 className="h-4 w-4" /></Button></TabsContent><TabsContent value="plan" className="space-y-3"><Button variant="outline" className="w-full justify-between" onClick={() => navigate("/planner")}>Weekly planner <CalendarDays className="h-4 w-4" /></Button><Button variant="outline" className="w-full justify-between" onClick={() => navigate("/roadmap")}>Goal roadmap <Target className="h-4 w-4" /></Button></TabsContent><TabsContent value="ideas" className="space-y-3"><Button variant="outline" className="w-full justify-between" onClick={() => navigate("/ideas")}>Ideas board <Lightbulb className="h-4 w-4" /></Button><Button variant="outline" className="w-full justify-between" onClick={() => navigate("/social")}>Challenges &amp; Quests <Trophy className="h-4 w-4 text-amber-500" /></Button></TabsContent></Tabs></CardContent></Card>
        </div>
      </main>
    </div>
  );
};

export default LifeOS;