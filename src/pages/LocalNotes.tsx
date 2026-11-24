import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Folder,
  Tag,
  Plus,
  Search,
  Pin,
  Trash2,
  Download,
  Upload,
  Eye,
  Edit3,
  Columns,
  Home,
  CheckSquare,
  Heading,
  Bold,
  Italic,
  Code,
  List,
  Quote,
  FolderOpen,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { LocalVaultLockButton } from "@/components/LocalVaultLockButton";
import { useToast } from "@/hooks/use-toast";
import { getNotesStore, type NoteItem } from "@/lib/data/notesStore";

export const LocalNotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");

  // Editing state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolder, setEditFolder] = useState("General");
  const [editTags, setEditTags] = useState("");
  const [tagInput, setTagInput] = useState("");

  const loadNotes = async () => {
    try {
      const store = await getNotesStore();
      const list = await store.listNotes();
      setNotes(list);
      if (!selectedNoteId && list.length > 0) {
        selectNote(list[0]);
      }
    } catch {
      toast({ description: "Could not load notes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const selectNote = (note: NoteItem) => {
    setSelectedNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFolder(note.folder);
    setEditTags(note.tags.join(", "));
  };

  const handleCreateNote = async () => {
    try {
      const store = await getNotesStore();
      const created = await store.createNote({
        title: "Untitled Note",
        folder: selectedFolder || "General",
        content: "# Untitled Note\n\nWrite your thoughts, daily plans, or project notes here...\n\n- [ ] Task 1\n- [ ] Task 2\n",
      });
      await loadNotes();
      selectNote(created);
      toast({ title: "Note created" });
    } catch {
      toast({ description: "Failed to create note", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!selectedNoteId) return;
    try {
      const store = await getNotesStore();
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await store.updateNote(selectedNoteId, {
        title: editTitle || "Untitled Note",
        content: editContent,
        folder: editFolder || "General",
        tags,
      });

      await loadNotes();
      toast({ title: "Note saved" });
    } catch {
      toast({ description: "Failed to save note", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const store = await getNotesStore();
      await store.deleteNote(id);
      await loadNotes();
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }
      toast({ title: "Note deleted" });
    } catch {
      toast({ description: "Failed to delete note", variant: "destructive" });
    }
  };

  const handleTogglePin = async (note: NoteItem) => {
    try {
      const store = await getNotesStore();
      await store.updateNote(note.id, { is_pinned: !note.is_pinned });
      await loadNotes();
    } catch {
      toast({ description: "Failed to update pin", variant: "destructive" });
    }
  };

  const handleExportMd = async (note: NoteItem) => {
    const store = await getNotesStore();
    const md = store.exportNoteToMarkdown(note);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded as .md" });
  };

  const handleExportHtml = async (note: NoteItem) => {
    const store = await getNotesStore();
    const html = store.exportNoteToHtml(note);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded as HTML" });
  };

  // Obsidian Vault Folder connection
  const [vaultDirHandle, setVaultDirHandle] = useState<any>(null);
  const [connectedFolderName, setConnectedFolderName] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnectLocalVault = async () => {
    if (!("showDirectoryPicker" in window)) {
      toast({
        title: "File System API unavailable",
        description: "Your browser does not support folder access. Use 'Import .md' to select files from disk.",
      });
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });
      setVaultDirHandle(handle);
      setConnectedFolderName(handle.name);

      let importedCount = 0;
      const store = await getNotesStore();
      for await (const entry of handle.values()) {
        if (entry.kind === "file" && (entry.name.endsWith(".md") || entry.name.endsWith(".markdown") || entry.name.endsWith(".txt"))) {
          const file = await entry.getFile();
          const content = await file.text();
          await store.importMarkdownNote(entry.name, content);
          importedCount++;
        }
      }
      await loadNotes();
      toast({
        title: "Obsidian Vault Linked",
        description: `Connected "${handle.name}". Loaded ${importedCount} markdown notes from local disk.`,
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ description: "Could not open local folder", variant: "destructive" });
      }
    }
  };

  const handleSyncToLocalVault = async () => {
    if (!vaultDirHandle) return;
    setIsSyncing(true);
    try {
      const store = await getNotesStore();
      const currentNotes = await store.listNotes();
      let savedCount = 0;
      for (const note of currentNotes) {
        const safeName = `${note.title.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}.md`;
        const fileHandle = await vaultDirHandle.getFileHandle(safeName, { create: true });
        const writable = await fileHandle.createWritable();
        const mdContent = store.exportNoteToMarkdown(note);
        await writable.write(mdContent);
        await writable.close();
        savedCount++;
      }
      toast({
        title: "Vault Synced to Local Disk",
        description: `Wrote ${savedCount} .md files into "${connectedFolderName}".`,
      });
    } catch {
      toast({ description: "Failed writing notes to local directory", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const store = await getNotesStore();
      let count = 0;
      let lastCreated: NoteItem | null = null;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        lastCreated = await store.importMarkdownNote(file.name, text);
        count++;
      }
      await loadNotes();
      if (lastCreated) selectNote(lastCreated);
      toast({
        title: "Import Complete",
        description: `Imported ${count} markdown note${count > 1 ? "s" : ""} from your computer.`,
      });
    } catch {
      toast({ description: "Failed to import markdown file(s)", variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportAllNotes = async () => {
    try {
      const store = await getNotesStore();
      const allNotes = await store.listNotes();
      if (allNotes.length === 0) {
        toast({ description: "No notes to export" });
        return;
      }
      for (const note of allNotes) {
        const md = store.exportNoteToMarkdown(note);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${note.title.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: "Export Complete", description: `Downloaded ${allNotes.length} markdown notes.` });
    } catch {
      toast({ description: "Failed exporting notes", variant: "destructive" });
    }
  };

  const insertSnippet = (snippet: string) => {
    setEditContent((prev) => `${prev}\n${snippet}\n`);
  };

  const folders = Array.from(new Set(notes.map((n) => n.folder))).filter(Boolean);

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder = selectedFolder ? n.folder === selectedFolder : true;
    return matchesSearch && matchesFolder;
  });

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  // Simple Markdown Parser for Preview
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("# ")) {
        return <h1 key={idx} className="text-2xl font-bold mt-4 mb-2 pb-1 border-b">{line.slice(2)}</h1>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-xl font-bold mt-3 mb-1">{line.slice(3)}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-lg font-semibold mt-2 mb-1">{line.slice(4)}</h3>;
      }
      if (line.startsWith("- [ ] ")) {
        return (
          <div key={idx} className="flex items-center gap-2 my-1 text-sm">
            <input type="checkbox" disabled className="rounded" />
            <span>{line.slice(6)}</span>
          </div>
        );
      }
      if (line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
        return (
          <div key={idx} className="flex items-center gap-2 my-1 text-sm text-muted-foreground line-through">
            <input type="checkbox" checked disabled className="rounded" />
            <span>{line.slice(6)}</span>
          </div>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return <li key={idx} className="ml-5 list-disc my-0.5 text-sm">{line.slice(2)}</li>;
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote key={idx} className="border-l-4 border-muted-foreground/40 pl-3 my-2 italic text-sm text-muted-foreground">
            {line.slice(2)}
          </blockquote>
        );
      }
      if (line.startsWith("```")) {
        return <pre key={idx} className="bg-muted p-2 rounded text-xs font-mono my-2 overflow-x-auto">{line}</pre>;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="my-1 text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="LifeOS Home">
              <Home className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              <h1 className="font-semibold text-lg hidden sm:inline">Obsidian / Markdown Vault</h1>
            </div>
            <LocalModeBadge />
            {connectedFolderName && (
              <Badge variant="secondary" className="gap-1.5 text-xs font-mono hidden md:flex items-center">
                <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />
                {connectedFolderName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <input ref={fileInputRef} type="file" multiple accept=".md,.markdown,.txt" className="hidden" onChange={handleImportFiles} />
            
            {connectedFolderName ? (
              <Button size="sm" variant="outline" onClick={handleSyncToLocalVault} disabled={isSyncing} className="gap-1.5 text-xs">
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : "text-emerald-500"}`} />
                {isSyncing ? "Syncing..." : "Sync to Folder"}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnectLocalVault} className="gap-1.5 text-xs" title="Open and sync a real local directory on your disk">
                <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />
                Link Local Vault
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs" title="Import markdown files">
              <Upload className="h-3.5 w-3.5 mr-1" />
              Import .md
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleExportAllNotes} className="text-xs hidden lg:flex" title="Download all notes as .md files">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export All
            </Button>

            <Button size="sm" onClick={handleCreateNote} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Note
            </Button>
            <LocalVaultLockButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Note List and Folders */}
        <aside className="w-80 border-r bg-muted/20 flex flex-col shrink-0">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search notes or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            {folders.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                <Button
                  size="sm"
                  variant={selectedFolder === null ? "secondary" : "ghost"}
                  className="h-7 text-xs px-2"
                  onClick={() => setSelectedFolder(null)}
                >
                  All
                </Button>
                {folders.map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={selectedFolder === f ? "secondary" : "ghost"}
                    className="h-7 text-xs px-2"
                    onClick={() => setSelectedFolder(f)}
                  >
                    <Folder className="h-3 w-3 mr-1" />
                    {f}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No notes found. Click "New Note" to create one.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === selectedNoteId;
                return (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={`p-3 rounded-md cursor-pointer border transition-colors ${
                      isSelected ? "bg-card border-primary/50 shadow-sm" : "hover:bg-muted/50 border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-medium text-sm truncate flex-1">{note.title}</h4>
                      {note.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {note.content.replace(/[#*`\-[\]]/g, "").slice(0, 80) || "Empty note"}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        {note.folder}
                      </span>
                      <span>{note.updated_at.slice(0, 10)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center / Main Editor Workspace */}
        {selectedNote ? (
          <main className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Top Toolbar */}
            <div className="p-3 border-b flex flex-wrap items-center justify-between gap-2 bg-muted/10">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Note Title"
                  className="font-semibold text-base h-9"
                  onBlur={handleSave}
                />
                <Input
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  placeholder="Folder"
                  className="w-32 text-xs h-9"
                  onBlur={handleSave}
                />
              </div>

              <div className="flex items-center gap-1">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="edit" className="text-xs px-2.5">
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="split" className="text-xs px-2.5">
                      <Columns className="h-3.5 w-3.5 mr-1" />
                      Split
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs px-2.5">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Button variant="ghost" size="icon" onClick={() => handleTogglePin(selectedNote)} title="Pin note">
                  <Pin className={`h-4 w-4 ${selectedNote.is_pinned ? "text-primary" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleExportMd(selectedNote)} title="Export .md">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedNote.id)} title="Delete note">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Markdown Quick Snippet Buttons (when in edit/split) */}
            {viewMode !== "preview" && (
              <div className="px-3 py-1.5 border-b flex gap-1 bg-muted/5 text-xs overflow-x-auto">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => insertSnippet("## Header")}>
                  <Heading className="h-3.5 w-3.5 mr-1" /> H2
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => insertSnippet("**bold text**")}>
                  <Bold className="h-3.5 w-3.5 mr-1" /> Bold
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => insertSnippet("*italic text*")}>
                  <Italic className="h-3.5 w-3.5 mr-1" /> Italic
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => insertSnippet("- [ ] Checklist item")}>
                  <CheckSquare className="h-3.5 w-3.5 mr-1" /> Checklist
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => insertSnippet("- Bullet item")}>
                  <List className="h-3.5 w-3.5 mr-1" /> List
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => insertSnippet("> Quote block")}>
                  <Quote className="h-3.5 w-3.5 mr-1" /> Quote
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => insertSnippet("```ts\n// Code snippet\n```")}>
                  <Code className="h-3.5 w-3.5 mr-1" /> Code
                </Button>
              </div>
            )}

            {/* Workspace Area: Edit, Split or Preview */}
            <div className="flex-1 flex overflow-hidden">
              {/* Edit Pane */}
              {(viewMode === "edit" || viewMode === "split") && (
                <div className={`flex-1 flex flex-col p-4 border-r overflow-hidden ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onBlur={handleSave}
                    placeholder="Write markdown here..."
                    className="flex-1 w-full resize-none font-mono text-sm bg-transparent border-0 focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t">
                    <span>
                      {editContent.split(/\s+/).filter(Boolean).length} words | {editContent.length} chars
                    </span>
                    <span>Autosaves on blur</span>
                  </div>
                </div>
              )}

              {/* Preview Pane */}
              {(viewMode === "preview" || viewMode === "split") && (
                <div className={`flex-1 p-6 overflow-y-auto prose dark:prose-invert max-w-none ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
                  <div className="mb-4">
                    <h1 className="text-3xl font-extrabold">{editTitle}</h1>
                    <div className="text-xs text-muted-foreground mt-1">
                      Folder: {editFolder} | Updated: {selectedNote.updated_at.slice(0, 16)}
                    </div>
                  </div>
                  <div className="mt-4">{renderMarkdown(editContent)}</div>
                </div>
              )}
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-sm">
            Select a note from the left, or click "New Note" to begin.
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalNotes;
