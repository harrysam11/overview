import { isLocalMode } from "@/lib/appMode";
import type { LocalNoteDocument } from "@/lib/local/schema";

export interface NoteItem extends LocalNoteDocument {}

export interface CreateNoteInput {
  title: string;
  content?: string;
  folder?: string;
  tags?: string[];
  is_pinned?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  folder?: string;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface NotesStore {
  listNotes(): Promise<NoteItem[]>;
  getNote(id: string): Promise<NoteItem | null>;
  createNote(input: CreateNoteInput): Promise<NoteItem>;
  updateNote(id: string, updates: UpdateNoteInput): Promise<NoteItem>;
  deleteNote(id: string): Promise<void>;
  exportNoteToMarkdown(note: NoteItem): string;
  exportNoteToHtml(note: NoteItem): string;
  importMarkdownNote(filename: string, content: string): Promise<NoteItem>;
}

export const getNotesStore = async (): Promise<NotesStore> => {
  const { localNotesStore } = await import("./localNotesStore");
  return localNotesStore;
};
