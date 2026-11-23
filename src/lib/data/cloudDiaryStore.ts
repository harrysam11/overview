import { supabase } from "@/integrations/supabase/client";
import type { DiaryStore, DiaryEntry, DiaryTag } from "./diaryStore";

export const cloudDiaryStore: DiaryStore = {
  mode: "cloud",

  async listEntries(): Promise<DiaryEntry[]> {
    const { data, error } = await supabase
      .from("diary_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []) as DiaryEntry[];
  },

  async createEntry(entryDate: string, title?: string, content: any = {}): Promise<DiaryEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("diary_entries")
      .insert({ user_id: user.id, entry_date: entryDate, title: title || "Untitled", content })
      .select()
      .single();

    if (error) throw error;
    return data as DiaryEntry;
  },

  async updateEntry(id: string, patch: Partial<{ entry_date: string; title: string | null; content: any }>): Promise<void> {
    const { error } = await supabase.from("diary_entries").update(patch).eq("id", id);
    if (error) throw error;
  },

  async deleteEntry(id: string): Promise<void> {
    const { error } = await supabase.from("diary_entries").delete().eq("id", id);
    if (error) throw error;
  },

  async listTags(): Promise<DiaryTag[]> {
    const { data, error } = await supabase
      .from("diary_entry_habits")
      .select("diary_entry_id,habit_id");
    if (error) throw error;
    return (data || []) as DiaryTag[];
  },

  async toggleTag(diaryEntryId: string, habitId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: existing } = await supabase
      .from("diary_entry_habits")
      .select("id")
      .eq("diary_entry_id", diaryEntryId)
      .eq("habit_id", habitId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("diary_entry_habits")
        .delete()
        .eq("diary_entry_id", diaryEntryId)
        .eq("habit_id", habitId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("diary_entry_habits")
        .insert({ diary_entry_id: diaryEntryId, habit_id: habitId, user_id: user.id });
      if (error) throw error;
    }
  },
};
