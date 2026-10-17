import { useState } from "react";
import { Plus, ExternalLink, Trash2, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppShortcuts, getFaviconUrl } from "@/hooks/useAppShortcuts";

interface AddEditShortcutFormProps {
  onSubmit: (name: string, url: string) => Promise<void>;
  initialName?: string;
  initialUrl?: string;
  submitLabel?: string;
  onClose: () => void;
}

const AddEditShortcutForm = ({
  onSubmit,
  initialName = "",
  initialUrl = "",
  submitLabel = "Add Shortcut",
  onClose,
}: AddEditShortcutFormProps) => {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [previewFavicon, setPreviewFavicon] = useState(
    initialUrl ? getFaviconUrl(initialUrl) : ""
  );

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim()) {
      let testUrl = value.trim();
      if (!testUrl.startsWith("http://") && !testUrl.startsWith("https://")) {
        testUrl = "https://" + testUrl;
      }
      try {
        new URL(testUrl);
        setPreviewFavicon(getFaviconUrl(testUrl));
      } catch {
        setPreviewFavicon("");
      }
    } else {
      setPreviewFavicon("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    
    setSaving(true);
    await onSubmit(name, url);
    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">App Name</Label>
        <Input
          id="name"
          placeholder="Google"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          placeholder="https://google.com"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          maxLength={2000}
          required
        />
      </div>
      {previewFavicon && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <img
            src={previewFavicon}
            alt="Favicon preview"
            className="w-8 h-8 rounded-full object-contain bg-background"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="text-sm text-muted-foreground">Favicon preview</span>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={saving || !name.trim() || !url.trim()}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
};

export const AppShortcutsMenu = () => {
  const { shortcuts, loading, addShortcut, removeShortcut, updateShortcut, openShortcut } = useAppShortcuts();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleAdd = async (name: string, url: string) => {
    await addShortcut(name, url);
  };

  const handleEdit = async (name: string, url: string) => {
    if (editingShortcut) {
      await updateShortcut(editingShortcut, name, url);
      setEditingShortcut(null);
    }
  };

  const handleOpenApp = (url: string) => {
    openShortcut(url);
    setPopoverOpen(false);
  };

  const editingShortcutData = editingShortcut 
    ? shortcuts.find(s => s.id === editingShortcut) 
    : null;

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">App Shortcuts</h4>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add App Shortcut</DialogTitle>
                  </DialogHeader>
                  <AddEditShortcutForm
                    onSubmit={handleAdd}
                    onClose={() => setAddDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <ScrollArea className="max-h-80">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shortcuts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No shortcuts yet</p>
                <p className="text-xs mt-1">Click "Add" to create one</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => handleOpenApp(shortcut.url)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center shrink-0 overflow-hidden">
                        {false && shortcut.favicon_url ? (
                          <img
                            src={shortcut.favicon_url}
                            alt={`${shortcut.name} favicon`}
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.onerror = null;
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                // Use safe DOM manipulation instead of innerHTML
                                const span = document.createElement('span');
                                span.className = 'text-xs font-medium';
                                span.textContent = shortcut.name.charAt(0).toUpperCase();
                                parent.appendChild(span);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {shortcut.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{shortcut.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {new URL(shortcut.url).hostname}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingShortcut(shortcut.id)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeShortcut(shortcut.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Edit Dialog */}
      <Dialog open={!!editingShortcut} onOpenChange={(open) => !open && setEditingShortcut(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shortcut</DialogTitle>
          </DialogHeader>
          {editingShortcutData && (
            <AddEditShortcutForm
              onSubmit={handleEdit}
              initialName={editingShortcutData.name}
              initialUrl={editingShortcutData.url}
              submitLabel="Save Changes"
              onClose={() => setEditingShortcut(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
