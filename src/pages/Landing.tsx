import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isLocalMode } from "@/lib/appMode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  BookOpen,
  Users,
  MessageCircle,
  Award,
  Target,
  Lightbulb,
  BarChart3,
  Bell,
  Sparkles,
  Zap,
  Shield,
  Smartphone,
  ArrowRight,
  StickyNote,
  Map,
  ListTodo,
  BriefcaseBusiness,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: ListTodo,
      title: "Habit Tracking",
      description: "Build daily habits with smart point-based scoring and instant progress feedback.",
    category: "Core",
  },
  {
    icon: Flame,
    title: "Streaks & Momentum",
    description: "Keep your streak alive with 80%+ daily points. Visual fire keeps you motivated.",
    category: "Core",
  },
  {
    icon: CalendarIcon,
    title: "Calendar View",
    description: "See every day at a glance — successes, near-misses, and points earned.",
    category: "Core",
  },
  {
    icon: BookOpen,
    title: "Daily Journal",
    description: "Reflect on your day with mood tracking and free-form journaling.",
    category: "Reflection",
  },
  {
    icon: StickyNote,
    title: "Scratch Pad",
    description: "Auto-saving notes for quick thoughts, reminders, and ideas as they hit you.",
    category: "Reflection",
  },
  {
    icon: Lightbulb,
    title: "Ideas Board",
    description: "Capture and organize ideas in a Kanban board with custom categories.",
    category: "Planning",
  },
  {
    icon: ListTodo,
    title: "Weekly Planner",
    description: "Plan your week, drag tasks across days, and stay focused on what matters.",
    category: "Planning",
  },
  {
    icon: Map,
    title: "Goal Roadmap",
    description: "Break big goals into milestones and visualize the path to achievement.",
    category: "Planning",
  },
  {
    icon: Trophy,
    title: "Levels & XP",
    description: "Earn XP for every habit completed. Level up and unlock new tiers.",
    category: "Gamification",
  },
  {
    icon: Award,
    title: "Achievement Badges",
    description: "Unlock dozens of badges across streaks, habits, journal, and social categories.",
    category: "Gamification",
  },
  {
    icon: Target,
    title: "Challenges",
    description: "Create or join challenges with friends. Compete on shared leaderboards.",
    category: "Social",
  },
  {
    icon: Users,
    title: "Friends & Groups",
    description: "Add friends, build groups, and grow together with a supportive circle.",
    category: "Social",
  },
  {
    icon: MessageCircle,
    title: "Real-time Chat",
    description: "Direct messages and group chats with end-to-end secured access.",
    category: "Social",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Charts and stats reveal patterns in your habits, mood, and productivity.",
    category: "Insights",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Real-time alerts for friend requests, challenge invites, and milestones.",
    category: "Insights",
  },
  {
    icon: Smartphone,
    title: "Offline-First",
    description: "Track habits anywhere — changes sync automatically when you're back online.",
    category: "Platform",
  },
  {
    icon: BriefcaseBusiness,
    title: "LifeOS Command Center",
    description: "Bring tasks, focus, projects, finance, health, and learning into one clear daily view.",
    category: "LifeOS",
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Row-level security, server-validated awards, and protected channels by default.",
    category: "Platform",
  },
  {
    icon: Sparkles,
    title: "Beautiful Themes",
    description: "Light and dark mode crafted with care, with smooth transitions throughout.",
    category: "Platform",
  },
];

const categories = ["Core", "Reflection", "Planning", "Gamification", "Social", "Insights", "Platform", "LifeOS"];

const Landing = () => {
  const navigate = useNavigate();
  // Local mode has no accounts: the app is always open on this device.
  const [authed, setAuthed] = useState(isLocalMode);

  useEffect(() => {
    if (isLocalMode) return;
    let unsubscribe = () => {};
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
      unsubscribe = () => subscription.unsubscribe();
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">HabitFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#categories" className="text-muted-foreground hover:text-foreground transition-colors">Explore</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {authed ? (
              <Button onClick={() => navigate("/dashboard")} size="sm">
                Open App
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm">
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute top-20 -left-32 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 -right-32 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Sparkles className="h-3 w-3" />
              Build the life you want, one habit at a time
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              Your all-in-one habit & life OS
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track habits, plan your week, set goals, journal, level up, and grow together with friends — all in one beautifully designed app.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate(authed ? "/dashboard" : "/auth")} className="gap-2">
                {authed ? (isLocalMode ? "Open LifeOS" : "Open Dashboard") : "Get Started Free"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Explore Features</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Free to start</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Works offline</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Private & secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "18+", l: "Powerful features" },
            { v: "100%", l: "Offline ready" },
            { v: "∞", l: "Habits to track" },
            { v: "0$", l: "To get started" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl md:text-4xl font-bold text-primary">{s.v}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to grow</h2>
          <p className="text-lg text-muted-foreground">
            From daily habits to long-term goals — and the social layer that keeps you accountable.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="group hover:shadow-lg hover:-translate-y-1 transition-all border-border/60">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                    </div>
                    <Badge variant="secondary" className="text-xs">{f.category}</Badge>
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription className="text-sm">{f.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">From zero to streak in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { n: "01", icon: Zap, t: "Add your habits", d: "Choose what matters: workouts, reading, sleep, water — anything you want to build." },
              { n: "02", icon: CalendarIcon, t: "Track daily", d: "Check off habits, journal your day, and watch your points and streak climb." },
              { n: "03", icon: Trophy, t: "Level up & connect", d: "Earn badges, level up, and join challenges with friends to stay accountable." },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.n} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="text-5xl font-black text-primary/10 absolute top-2 right-4">{s.n}</div>
                    <div className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl">{s.t}</CardTitle>
                    <CardDescription>{s.d}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-4">Explore by area</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">A complete toolkit</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {categories.map((cat) => {
            const items = features.filter((f) => f.category === cat);
            return (
              <Card key={cat} className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {cat}
                    <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {items.map((i) => (
                      <li key={i.title} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        {i.title}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/15" />
          <CardContent className="relative py-16 px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Start your streak today</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join HabitFlow and turn small daily wins into a life-changing routine.
            </p>
            <Button size="lg" onClick={() => navigate(authed ? "/dashboard" : "/auth")} className="gap-2">
              {authed ? (isLocalMode ? "Open LifeOS" : "Go to Dashboard") : "Create your free account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} HabitFlow. Build better, daily.</span>
          </div>
          <div className="flex gap-6">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="#features" className="hover:text-foreground">Features</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
