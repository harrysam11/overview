import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Target, Sparkles, Share2, Plus, Calendar, ShieldCheck, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { LocalVaultLockButton } from "@/components/LocalVaultLockButton";
import { CreateChallengeDialog } from "@/components/challenges/CreateChallengeDialog";
import { useChallenges, ChallengeGoalType } from "@/hooks/useChallenges";
import { useUserStats } from "@/hooks/useUserStats";
import { useLevel } from "@/hooks/useLevel";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isFuture } from "date-fns";

const LocalSocial = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { challenges, participants, loading, createChallenge, deleteChallenge } = useChallenges();
  const { stats } = useUserStats();
  const { level, currentXP, xpToNextLevel } = useLevel();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");

  const now = new Date();

  const filteredChallenges = challenges.filter((c) => {
    const isEnded = isPast(new Date(c.end_date));
    const parts = participants.get(c.id) || [];
    const myProgress = parts.find((p) => p.user_id === "local-user")?.progress || 0;
    const isDone = myProgress >= c.goal_value || isEnded;

    if (filter === "active") return !isDone && !isEnded;
    if (filter === "completed") return isDone || myProgress >= c.goal_value;
    return true;
  });

  const getGoalLabel = (type: ChallengeGoalType, value: number) => {
    switch (type) {
      case "points":
        return `${value} Total Points`;
      case "streak_days":
        return `${value}-Day Active Streak`;
      case "habits_completed":
        return `${value} Habits Checked Off`;
    }
  };

  const handleShareChallenge = (c: typeof challenges[0]) => {
    const text = `🏆 HabitFlow Challenge: "${c.name}"\n🎯 Goal: ${getGoalLabel(c.goal_type, c.goal_value)}\n📅 ${c.start_date.slice(0, 10)} to ${c.end_date.slice(0, 10)}\nJoin me offline on HabitFlow LifeOS!`;
    navigator.clipboard?.writeText(text).then(() => {
      toast({ title: "Challenge copied!", description: "Challenge text copied to clipboard. Share with friends!" });
    }).catch(() => {
      toast({ title: "Challenge details", description: text });
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="Back to LifeOS">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h1 className="font-semibold text-lg">Challenges &amp; Quests</h1>
            </div>
            <LocalModeBadge />
          </div>
          <div className="flex items-center gap-2">
            <CreateChallengeDialog onCreate={createChallenge} />
            <LocalVaultLockButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="challenges" className="gap-2">
              <Target className="h-4 w-4" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <Trophy className="h-4 w-4" />
              Records
            </TabsTrigger>
            <TabsTrigger value="p2p" className="gap-2">
              <Share2 className="h-4 w-4" />
              Peer Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === "active" ? "default" : "outline"}
                  onClick={() => setFilter("active")}
                >
                  Active ({challenges.filter((c) => !isPast(new Date(c.end_date))).length})
                </Button>
                <Button
                  size="sm"
                  variant={filter === "completed" ? "default" : "outline"}
                  onClick={() => setFilter("completed")}
                >
                  Completed
                </Button>
                <Button
                  size="sm"
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                >
                  All ({challenges.length})
                </Button>
              </div>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Loading challenges…</p>
            ) : filteredChallenges.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent className="space-y-4">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="font-semibold text-lg">No challenges in this view</h3>
                    <p className="text-sm text-muted-foreground">
                      Set a personal goal like a 7-day streak, 100 points, or 30 habits checked.
                    </p>
                  </div>
                  <CreateChallengeDialog onCreate={createChallenge} />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredChallenges.map((c) => {
                  const parts = participants.get(c.id) || [];
                  const myProgress = parts.find((p) => p.user_id === "local-user")?.progress || 0;
                  const pct = Math.min(100, Math.round((myProgress / c.goal_value) * 100));
                  const isDone = myProgress >= c.goal_value;
                  const isEnded = isPast(new Date(c.end_date));

                  return (
                    <Card key={c.id} className="relative overflow-hidden flex flex-col justify-between">
                      {isDone && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Achieved 🏆</Badge>
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold">{c.name}</CardTitle>
                          {c.description && (
                            <CardDescription className="text-xs line-clamp-2">{c.description}</CardDescription>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Goal: {getGoalLabel(c.goal_type, c.goal_value)}</span>
                            <span className="font-medium text-foreground">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress: {myProgress} / {c.goal_value}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {c.end_date.slice(0, 10)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button variant="ghost" size="sm" onClick={() => handleShareChallenge(c)}>
                            <Share2 className="h-3.5 w-3.5 mr-1" />
                            Share
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteChallenge(c.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Best &amp; Habit Records</CardTitle>
                <CardDescription>All records are computed directly from your encrypted on-device history.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="p-4 rounded-lg border bg-card space-y-1">
                  <div className="text-xs text-muted-foreground">Level &amp; Rank</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    Level {level}
                  </div>
                  <div className="text-xs text-muted-foreground">{currentXP} XP / {xpToNextLevel} to next</div>
                </div>

                <div className="p-4 rounded-lg border bg-card space-y-1">
                  <div className="text-xs text-muted-foreground">Current Streak</div>
                  <div className="text-2xl font-bold flex items-center gap-1 text-amber-500">
                    <Flame className="h-5 w-5" />
                    {stats?.currentStreak ?? 0} days
                  </div>
                  <div className="text-xs text-muted-foreground">Best: {stats?.longestStreak ?? 0} days</div>
                </div>

                <div className="p-4 rounded-lg border bg-card space-y-1">
                  <div className="text-xs text-muted-foreground">Total Points</div>
                  <div className="text-2xl font-bold text-primary">
                    {stats?.totalPoints ?? 0} pts
                  </div>
                  <div className="text-xs text-muted-foreground">Earned across all habits</div>
                </div>

                <div className="p-4 rounded-lg border bg-card space-y-1">
                  <div className="text-xs text-muted-foreground">Total Check-ins</div>
                  <div className="text-2xl font-bold">
                    {stats?.totalCheckIns ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Logged on this device</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="p2p" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Peer-to-Peer &amp; Offline Privacy</CardTitle>
                <CardDescription>
                  HabitFlow operates offline without external tracking servers. Social interaction happens privately on your terms.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="font-medium">Zero Telemetry &amp; Private Sync</div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      To share challenges or progress across your laptop, phone, or with a friend, export an encrypted backup or share challenge details directly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => navigate("/data")}>Open Sync &amp; Backup Manager</Button>
                  <Button variant="outline" onClick={() => navigate("/habits")}>View Habits</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LocalSocial;
