import { APP_MODE, type AppMode } from "@/lib/appMode";

export interface DiaryEntry {
  id: string;
  entry_date: string;
  title: string | null;
  content: any;
  updated_at: string;
}

export interface DiaryTag {
  diary_entry_id: string;
  habit_id: string;
}

export interface DiaryStore {
  mode: AppMode;
  listEntries(): Promise<DiaryEntry[]>;
  createEntry(entryDate: string, title?: string, content?: any): Promise<DiaryEntry>;
  updateEntry(id: string, patch: Partial<{ entry_date: string; title: string | null; content: any }>): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  listTags(): Promise<DiaryTag[]>;
  toggleTag(diaryEntryId: string, habitId: string): Promise<void>;
}

let storePromise: Promise<DiaryStore> | null = null;

export const getDiaryStore = (mode: AppMode = APP_MODE): Promise<DiaryStore> => {
  if (!storePromise) {
    storePromise =
      mode === "cloud"
        ? import("./cloudDiaryStore").then((m) => m.cloudDiaryStore)
        : import("./localDiaryStore").then((m) => m.localDiaryStore);
  }
  return storePromise;
};
