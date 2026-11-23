import { readVaultData, updateVaultData } from "@/lib/local/vault";
import { newId, nowIso } from "@/lib/local/localDb";
import type { NotesStore, NoteItem, CreateNoteInput, UpdateNoteInput } from "./notesStore";

export const localNotesStore: NotesStore = {
  async listNotes(): Promise<NoteItem[]> {
    const data = await readVaultData();
    return (data.notes || []).sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  },

  async getNote(id: string): Promise<NoteItem | null> {
    const data = await readVaultData();
    return (data.notes || []).find((n) => n.id === id) || null;
  },

  async createNote(input: CreateNoteInput): Promise<NoteItem> {
    const timestamp = nowIso();
    const newNote: NoteItem = {
      id: newId(),
      title: input.title.trim() || "Untitled Note",
      content: input.content || "",
      folder: input.folder?.trim() || "General",
      tags: input.tags || [],
      is_pinned: input.is_pinned ?? false,
      is_archived: false,
      created_at: timestamp,
      updated_at: timestamp,
    };

    await updateVaultData((data) => ({
      ...data,
      notes: [newNote, ...(data.notes || [])],
    }));

    return newNote;
  },

  async updateNote(id: string, updates: UpdateNoteInput): Promise<NoteItem> {
    let updatedNote: NoteItem | null = null;
    const timestamp = nowIso();

    await updateVaultData((data) => {
      const notes = (data.notes || []).map((n) => {
        if (n.id === id) {
          updatedNote = {
            ...n,
            ...updates,
            updated_at: timestamp,
          };
          return updatedNote;
        }
        return n;
      });

      return {
        ...data,
        notes,
      };
    });

    if (!updatedNote) throw new Error("Note not found");
    return updatedNote;
  },

  async deleteNote(id: string): Promise<void> {
    await updateVaultData((data) => ({
      ...data,
      notes: (data.notes || []).filter((n) => n.id !== id),
    }));
  },

  exportNoteToMarkdown(note: NoteItem): string {
    const frontmatter = [
      "---",
      `title: "${note.title.replace(/"/g, '\\"')}"`,
      `folder: "${note.folder}"`,
      `tags: [${note.tags.map((t) => `"${t}"`).join(", ")}]`,
      `created_at: "${note.created_at}"`,
      `updated_at: "${note.updated_at}"`,
      "---",
      "",
    ].join("\n");

    return `${frontmatter}\n${note.content}`;
  },

  exportNoteToHtml(note: NoteItem): string {
    // Clean, portable standalone HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${note.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #222; }
    h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 8px; }
    pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; }
    code { font-family: monospace; background: #f1f1f1; padding: 2px 4px; border-radius: 4px; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    .meta { font-size: 0.85em; color: #666; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div class="meta">Folder: ${note.folder} | Updated: ${note.updated_at.slice(0, 10)}</div>
  <div class="content"><pre>${note.content}</pre></div>
</body>
</html>`;
  },

  async importMarkdownNote(filename: string, content: string): Promise<NoteItem> {
    let title = filename.replace(/\.(md|markdown|txt)$/i, "");
    let body = content;
    let folder = "Imported";
    let tags: string[] = [];

    // Check for frontmatter
    if (content.startsWith("---")) {
      const parts = content.split("---");
      if (parts.length >= 3) {
        const fm = parts[1];
        body = parts.slice(2).join("---").trim();
        const titleMatch = fm.match(/title:\s*["']?([^"'\n]+)["']?/);
        if (titleMatch) title = titleMatch[1].trim();
        const folderMatch = fm.match(/folder:\s*["']?([^"'\n]+)["']?/);
        if (folderMatch) folder = folderMatch[1].trim();
      }
    }

    return this.createNote({
      title,
      content: body,
      folder,
      tags,
    });
  },
};
