import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Link as LinkIcon, Trash2, Upload, ExternalLink, Download, Loader2, Image as ImageIcon } from "lucide-react";

interface WorkspaceItem {
  id: string;
  item_type: "file" | "link";
  title: string;
  url: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

interface Props {
  habitId: string | null;
  habitName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const HabitWorkspaceDialog = ({ habitId, habitName, open, onOpenChange }: Props) => {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && habitId) load();
    if (!open) {
      setItems([]); setLinkUrl(""); setLinkTitle("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habitId]);

  const load = async () => {
    if (!habitId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("habit_workspace_items")
      .select("*")
      .eq("habit_id", habitId)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    else setItems((data || []) as WorkspaceItem[]);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !habitId) return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File too large", description: "Max 25MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${habitId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("habit-files").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("habit_workspace_items").insert({
        habit_id: habitId,
        user_id: user.id,
        item_type: "file",
        title: file.name.slice(0, 200),
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
      });
      if (insErr) throw insErr;
      toast({ title: "File uploaded" });
      await load();
    } catch (err: any) {
      toast({ title: "Upload failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleAddLink = async () => {
    if (!habitId) return;
    let url = linkUrl.trim();
    const title = linkTitle.trim() || url;
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      new URL(url);
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }
    if (title.length > 200) {
      toast({ title: "Title too long", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("habit_workspace_items").insert({
      habit_id: habitId,
      user_id: user.id,
      item_type: "link",
      title: title.slice(0, 200),
      url,
    });
    if (error) {
      toast({ title: "Failed to add link", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      return;
    }
    setLinkUrl(""); setLinkTitle("");
    toast({ title: "Link added" });
    load();
  };

  const handleDelete = async (item: WorkspaceItem) => {
    if (item.item_type === "file" && item.file_path) {
      await supabase.storage.from("habit-files").remove([item.file_path]);
    }
    const { error } = await supabase.from("habit_workspace_items").delete().eq("id", item.id);
    if (error) {
      toast({ title: "Delete failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      return;
    }
    setItems(items.filter((i) => i.id !== item.id));
  };

  const openFile = async (item: WorkspaceItem) => {
    if (!item.file_path) return;
    const { data, error } = await supabase.storage
      .from("habit-files")
      .createSignedUrl(item.file_path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open file", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const formatSize = (b?: number | null) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workspace · {habitName}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="items" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="link">Add Link</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="overflow-y-auto space-y-2 mt-4">
            {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
            {!loading && items.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No items yet. Upload files or add links.</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                <div className="text-muted-foreground">
                  {item.item_type === "link" ? <LinkIcon className="h-5 w-5" /> :
                    item.mime_type?.startsWith("image/") ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.item_type === "link" ? item.url : `${item.mime_type || "file"} · ${formatSize(item.file_size)}`}
                  </p>
                </div>
                {item.item_type === "link" ? (
                  <Button variant="ghost" size="icon" onClick={() => window.open(item.url!, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => openFile(item)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="upload" className="mt-4 space-y-3">
            <label className="block">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/40 cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground">Max 25MB · Files open in browser</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-3">
            <Input placeholder="Title (optional)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} maxLength={200} />
            <Input placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            <Button onClick={handleAddLink} disabled={!linkUrl.trim()} className="w-full">
              <LinkIcon className="h-4 w-4 mr-2" /> Add Link
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
