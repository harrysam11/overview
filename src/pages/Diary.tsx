import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, BookOpen, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RichEditor } from "@/components/editor/RichEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Habit { id: string; name: string; type: "do" | "dont"; }
interface DiaryEntry {
  id: string;
  entry_date: string;
  title: string | null;
  content: any;
  updated_at: string;
}

const Diary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [tags, setTags] = useState<Map<string, Set<string>>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterHabit, setFilterHabit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      await loadAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [h, e, t] = await Promise.all([
      supabase.from("habits").select("id,name,type").eq("is_active", true).order("created_at"),
      supabase.from("diary_entries").select("*").order("entry_date", { ascending: false }).order("updated_at", { ascending: false }),
      supabase.from("diary_entry_habits").select("diary_entry_id,habit_id"),
    ]);
    if (h.data) setHabits(h.data as Habit[]);
    if (e.data) {
      setEntries(e.data as DiaryEntry[]);
      if (e.data.length && !selectedId) setSelectedId(e.data[0].id);
    }
    const tmap = new Map<string, Set<string>>();
    (t.data || []).forEach((r: any) => {
      if (!tmap.has(r.diary_entry_id)) tmap.set(r.diary_entry_id, new Set());
      tmap.get(r.diary_entry_id)!.add(r.habit_id);
    });
    setTags(tmap);
    setLoading(false);
  };

  const selected = entries.find((e) => e.id === selectedId) || null;
  const visibleEntries = filterHabit
    ? entries.filter((e) => tags.get(e.id)?.has(filterHabit))
    : entries;

  const createEntry = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("diary_entries")
      .insert({ user_id: user.id, entry_date: today, title: "Untitled", content: {} })
      .select()
      .single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setEntries([data as DiaryEntry, ...entries]);
    setSelectedId(data!.id);
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("diary_entries").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    const remaining = entries.filter((e) => e.id !== id);
    setEntries(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id || null);
  };

  const updateEntry = useCallback(async (patch: Partial<DiaryEntry>) => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("diary_entries")
      .update(patch)
      .eq("id", selected.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else setEntries((prev) => prev.map((e) => (e.id === selected.id ? { ...e, ...patch } : e)));
    setSaving(false);
  }, [selected, toast]);

  const toggleTag = async (habitId: string) => {
    if (!selected) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = tags.get(selected.id) || new Set();
    const next = new Map(tags);
    if (current.has(habitId)) {
      await supabase.from("diary_entry_habits").delete()
        .eq("diary_entry_id", selected.id).eq("habit_id", habitId);
      const ns = new Set(current); ns.delete(habitId);
      next.set(selected.id, ns);
    } else {
      const { error } = await supabase.from("diary_entry_habits").insert({
        diary_entry_id: selected.id, habit_id: habitId, user_id: user.id,
      });
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      const ns = new Set(current); ns.add(habitId);
      next.set(selected.id, ns);
    }
    setTags(next);
  };

  // debounced auto-save for editor content
  const handleContentChange = (json: any) => {
    if (!selected) return;
    setEntries((prev) => prev.map((e) => (e.id === selected.id ? { ...e, content: json } : e)));
  };

  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => {
      updateEntry({ content: selected.content });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.content]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Universal Diary</h1>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-3">
          <Button onClick={createEntry} className="w-full"><Plus className="h-4 w-4 mr-2" />New Entry</Button>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-1">Filter by habit</p>
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={filterHabit === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterHabit(null)}
              >All</Badge>
              {habits.map((h) => (
                <Badge
                  key={h.id}
                  variant={filterHabit === h.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilterHabit(h.id)}
                >{h.name}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            {!loading && visibleEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No entries yet.</p>
            )}
            {visibleEntries.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  "w-full text-left p-2 rounded-md border text-sm hover:bg-muted/50 transition-colors",
                  selectedId === e.id && "bg-muted border-primary"
                )}
              >
                <p className="font-medium truncate">{e.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(e.entry_date), "MMM d, yyyy")}</p>
                {tags.get(e.id) && tags.get(e.id)!.size > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.from(tags.get(e.id)!).slice(0, 3).map((hid) => {
                      const h = habits.find((x) => x.id === hid);
                      return h ? <span key={hid} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{h.name}</span> : null;
                    })}
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <section>
          {!selected ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              Select an entry or create a new one to start writing.
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    type="date"
                    value={selected.entry_date}
                    onChange={(e) => updateEntry({ entry_date: e.target.value })}
                    className="w-auto"
                  />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteEntry(selected.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={selected.title || ""}
                  onChange={(e) => setEntries((prev) => prev.map((x) => x.id === selected.id ? { ...x, title: e.target.value } : x))}
                  onBlur={() => updateEntry({ title: selected.title })}
                  placeholder="Title"
                  className="text-xl font-semibold border-0 px-0 focus-visible:ring-0"
                  maxLength={200}
                />
                <div className="flex items-start gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground mt-1" />
                  {habits.length === 0 && <span className="text-xs text-muted-foreground">No habits to tag</span>}
                  {habits.map((h) => {
                    const active = tags.get(selected.id)?.has(h.id);
                    return (
                      <Badge
                        key={h.id}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(h.id)}
                      >{h.name}</Badge>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent>
                <RichEditor
                  content={selected.content || {}}
                  onChange={handleContentChange}
                  placeholder="Write freely — notes, links, checklists..."
                />
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default Diary;
