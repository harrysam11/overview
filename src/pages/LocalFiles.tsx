import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen,
  File,
  FileText,
  Image,
  Upload,
  Download,
  Trash2,
  Search,
  Eye,
  HardDrive,
  Home,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  X,
  Gauge,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { LocalVaultLockButton } from "@/components/LocalVaultLockButton";
import { useToast } from "@/hooks/use-toast";
import {
  getFileSystemStore,
  type StoredFileItem,
} from "@/lib/data/fileSystemStore";
import { LIMITS } from "@/lib/local/schema";

const STORAGE_SIZE_LIMIT_KEY = "habitflow-max-upload-mb";

export const LocalFiles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<StoredFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<StoredFileItem | null>(null);

  // Storage quota state from navigator.storage.estimate()
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  // User-configurable file size threshold (5, 10, 15, or 25 MB)
  const [maxUploadMb, setMaxUploadMb] = useState<number>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_SIZE_LIMIT_KEY);
      return saved ? parseInt(saved, 10) : 25;
    } catch {
      return 25;
    }
  });

  const handleMaxUploadMbChange = (mb: number) => {
    setMaxUploadMb(mb);
    try {
      window.localStorage.setItem(STORAGE_SIZE_LIMIT_KEY, String(mb));
    } catch {}
    toast({ title: `Upload limit set to ${mb} MB` });
  };

  const updateEstimate = async () => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.usage !== undefined && est.quota !== undefined) {
          setStorageEstimate({ usage: est.usage, quota: est.quota });
        }
      } catch {}
    }
  };

  const loadFiles = async () => {
    try {
      const store = await getFileSystemStore();
      const list = await store.listFiles();
      setFiles(list);
      await updateEstimate();
    } catch {
      toast({ description: "Failed to load files from local vault", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const allowedBytes = Math.min(maxUploadMb * 1024 * 1024, LIMITS.maxFileSizeBytes);

    if (selected.size > allowedBytes) {
      toast({
        title: "File exceeds upload limit",
        description: `Selected file is ${(selected.size / (1024 * 1024)).toFixed(1)} MB. Current limit is ${maxUploadMb} MB.`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (files.length >= LIMITS.maxFiles) {
      toast({
        title: "File limit reached",
        description: `Max ${LIMITS.maxFiles} files can be stored in the local vault.`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          const base64 = result.includes(",") ? result.split(",")[1] : result;

          const store = await getFileSystemStore();
          await store.saveFile({
            name: selected.name,
            type: selected.type || "application/octet-stream",
            size: selected.size,
            dataBase64: base64,
          });

          toast({ title: "File encrypted and saved to vault" });
          await loadFiles();
        } catch {
          toast({ description: "Could not save file to vault", variant: "destructive" });
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };

      reader.onerror = () => {
        setUploading(false);
        toast({ description: "Failed reading file from disk", variant: "destructive" });
      };

      reader.readAsDataURL(selected);
    } catch {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from encrypted storage?`)) return;
    try {
      const store = await getFileSystemStore();
      await store.deleteFile(id);
      toast({ title: "File deleted" });
      if (previewFile?.id === id) setPreviewFile(null);
      await loadFiles();
    } catch {
      toast({ description: "Failed to delete file", variant: "destructive" });
    }
  };

  const handleClearAll = async () => {
    if (!files.length) return;
    if (!confirm(`Are you sure you want to delete ALL ${files.length} files from your encrypted vault? This cannot be undone.`)) return;
    try {
      const store = await getFileSystemStore();
      for (const f of files) {
        await store.deleteFile(f.id);
      }
      toast({ title: "All vault files cleared" });
      setPreviewFile(null);
      await loadFiles();
    } catch {
      toast({ description: "Failed clearing files", variant: "destructive" });
    }
  };

  const handleDownload = async (file: StoredFileItem) => {
    try {
      const store = await getFileSystemStore();
      store.downloadFile(file);
    } catch {
      toast({ description: "Download failed", variant: "destructive" });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (type: string, name: string) => {
    if (type.startsWith("image/")) return <Image className="h-5 w-5 text-sky-500" />;
    if (type.includes("pdf") || type.includes("text") || name.endsWith(".md") || name.endsWith(".txt")) {
      return <FileText className="h-5 w-5 text-indigo-500" />;
    }
    if (type.includes("csv") || type.includes("excel") || type.includes("spreadsheet") || name.endsWith(".csv")) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    }
    if (type.includes("json") || name.endsWith(".json") || name.endsWith(".js") || name.endsWith(".ts")) {
      return <FileCode className="h-5 w-5 text-amber-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const filtered = files.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quotaPct = storageEstimate && storageEstimate.quota > 0
    ? (storageEstimate.usage / storageEstimate.quota) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="LifeOS Home">
              <Home className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-500" />
              <h1 className="font-semibold text-lg">Encrypted Filesystem</h1>
            </div>
            <LocalModeBadge />
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {uploading ? "Encrypting..." : "Upload File"}
            </Button>
            {files.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-destructive hover:bg-destructive/10"
              >
                Clear All
              </Button>
            )}
            <LocalVaultLockButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Storage stats header */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Stored Files</p>
                <p className="text-2xl font-bold mt-1">{files.length} / {LIMITS.maxFiles}</p>
              </div>
              <HardDrive className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Encrypted Vault Files</p>
                <p className="text-2xl font-bold mt-1">{formatBytes(totalBytes)}</p>
              </div>
              <FolderOpen className="h-6 w-6 text-amber-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Browser Quota Used</p>
                <p className="text-2xl font-bold mt-1">
                  {storageEstimate ? formatBytes(storageEstimate.usage) : "Measuring..."}
                </p>
                {storageEstimate && (
                  <p className="text-[11px] text-muted-foreground">
                    of {formatBytes(storageEstimate.quota)} ({quotaPct.toFixed(2)}%)
                  </p>
                )}
              </div>
              <Gauge className="h-6 w-6 text-emerald-500" />
            </CardContent>
          </Card>
        </div>

        {/* Live Storage Meter & Config bar */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Max Upload Size per File:</span>
                <select
                  value={maxUploadMb}
                  onChange={(e) => handleMaxUploadMbChange(Number(e.target.value))}
                  className="bg-muted border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                >
                  <option value={5}>5 MB (Strict)</option>
                  <option value={10}>10 MB</option>
                  <option value={15}>15 MB</option>
                  <option value={25}>25 MB (Full)</option>
                </select>
              </div>
              <div className="text-muted-foreground">
                IndexedDB AES-256-GCM sandbox storage
              </div>
            </div>

            {storageEstimate && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Device Sandbox Storage Consumption</span>
                  <span>{quotaPct.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(100, quotaPct)} className="h-1.5" />
              </div>
            )}

            {quotaPct > 80 && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Browser storage quota is over 80% full. Delete unused files to prevent quota exhaustion.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search stored documents, images, sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Up to {maxUploadMb} MB per file • Stored inside browser vault
          </span>
        </div>

        {/* Files Grid / List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed py-16 text-center">
            <CardContent className="space-y-3">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <CardTitle className="text-base">No files stored in this vault</CardTitle>
              <CardDescription className="text-xs max-w-sm mx-auto">
                Upload PDFs, receipts, notes, templates, images, or documents. All attachments are encrypted at rest with your passphrase.
              </CardDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Upload first file
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((file) => (
              <Card key={file.id} className="group hover:border-primary/40 transition-colors flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getFileIcon(file.type, file.name)}
                      <span className="font-medium text-sm truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>{formatBytes(file.size)}</span>
                    <span>{file.created_at.slice(0, 10)}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 border-t mt-3 flex items-center justify-between bg-muted/20">
                  <div className="flex gap-1">
                    {(file.type.startsWith("image/") || file.type.includes("text") || file.name.endsWith(".md") || file.name.endsWith(".txt") || file.name.endsWith(".json")) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        title="Quick Preview"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      title="Download"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    title="Delete"
                    onClick={() => handleDelete(file.id, file.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden bg-background">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2 truncate">
                {getFileIcon(previewFile.type, previewFile.name)}
                <span className="font-semibold text-sm truncate">{previewFile.name}</span>
                <span className="text-xs text-muted-foreground">({formatBytes(previewFile.size)})</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(previewFile)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1">
              {previewFile.type.startsWith("image/") ? (
                <div className="flex justify-center">
                  <img
                    src={`data:${previewFile.type};base64,${previewFile.data_base64}`}
                    alt={previewFile.name}
                    className="max-h-[60vh] max-w-full rounded object-contain"
                  />
                </div>
              ) : (
                <pre className="text-xs font-mono p-3 bg-muted rounded overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {(() => {
                    try {
                      return atob(previewFile.data_base64);
                    } catch {
                      return "Binary content cannot be previewed directly. Click download to view.";
                    }
                  })()}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LocalFiles;
