import { newId, nowIso } from "@/lib/local/localDb";
import {
  localDiaryEntrySchema,
  localDiaryEntryHabitSchema,
  type LocalDiaryEntry,
  type LocalDiaryEntryHabit,
} from "@/lib/local/schema";
import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { DiaryStore, DiaryEntry, DiaryTag } from "./diaryStore";

export const localDiaryStore: DiaryStore = {
  mode: "local",

  async listEntries(): Promise<DiaryEntry[]> {
    const data = await readVaultData();
    const entries = data.diary_entries || [];
    return [...entries].sort((a, b) => {
      const dateDiff = b.entry_date.localeCompare(a.entry_date);
      if (dateDiff !== 0) return dateDiff;
      return b.updated_at.localeCompare(a.updated_at);
    });
  },

  async createEntry(entryDate: string, title?: string, content: any = {}): Promise<DiaryEntry> {
    const now = nowIso();
    const newEntry: LocalDiaryEntry = localDiaryEntrySchema.parse({
      id: newId(),
      entry_date: entryDate,
      title: title || "Untitled",
      content,
      created_at: now,
      updated_at: now,
    });
    await updateVaultData((current) => ({
      ...current,
      diary_entries: [newEntry, ...(current.diary_entries || [])],
    }));
    return newEntry;
  },

  async updateEntry(id: string, patch: Partial<{ entry_date: string; title: string | null; content: any }>): Promise<void> {
    const now = nowIso();
    await updateVaultData((current) => ({
      ...current,
      diary_entries: (current.diary_entries || []).map((e) =>
        e.id === id ? { ...e, ...patch, updated_at: now } : e
      ),
    }));
  },

  async deleteEntry(id: string): Promise<void> {
    await updateVaultData((current) => ({
      ...current,
      diary_entries: (current.diary_entries || []).filter((e) => e.id !== id),
      diary_entry_habits: (current.diary_entry_habits || []).filter((h) => h.diary_entry_id !== id),
    }));
  },

  async listTags(): Promise<DiaryTag[]> {
    const data = await readVaultData();
    return (data.diary_entry_habits || []).map((t) => ({
      diary_entry_id: t.diary_entry_id,
      habit_id: t.habit_id,
    }));
  },

  async toggleTag(diaryEntryId: string, habitId: string): Promise<void> {
    const now = nowIso();
    await updateVaultData((current) => {
      const existing = (current.diary_entry_habits || []).find(
        (t) => t.diary_entry_id === diaryEntryId && t.habit_id === habitId
      );
      if (existing) {
        return {
          ...current,
          diary_entry_habits: (current.diary_entry_habits || []).filter((t) => t.id !== existing.id),
        };
      }
      const newTag: LocalDiaryEntryHabit = localDiaryEntryHabitSchema.parse({
        id: newId(),
        diary_entry_id: diaryEntryId,
        habit_id: habitId,
        created_at: now,
      });
      return {
        ...current,
        diary_entry_habits: [...(current.diary_entry_habits || []), newTag],
      };
    });
  },
};
