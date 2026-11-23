import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Upload, Home, ShieldCheck, ShieldAlert, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { requestPersistentStorage } from "@/lib/appMode";
import { backupCounts, exportLocalData, parseBackup, replaceLocalData } from "@/lib/local/backup";
import { LIMITS, type LocalBackup } from "@/lib/local/schema";
import { decryptBackupWithPassphrase, exportEncryptedBackup } from "@/lib/local/vault";
import { LocalVaultLockButton } from "@/components/LocalVaultLockButton";

const LocalData = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<LocalBackup | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingIsPlaintext, setPendingIsPlaintext] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [busy, setBusy] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const handleExport = async () => {
    setBusy(true);
    try {
      const backup = await exportLocalData();
      const encrypted = await exportEncryptedBackup(backup);
      const blob = new Blob([encrypted], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `habitflow-backup-${backup.exported_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const c = backupCounts(backup);
      toast({ title: "Backup downloaded", description: `${c.habits} habits, ${c.records} check-ins, ${c.journal} journal entries.` });
    } catch (e) {
      console.error(e);
      toast({ description: "Could not create a backup.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > LIMITS.maxImportBytes) {
      toast({ description: "File is larger than 10 MB.", variant: "destructive" });
      return;
    }
    try {
      const text = await file.text();
      const plaintext = parseBackup(text);
      setPendingText(text);
      setPending(plaintext.ok ? plaintext.backup : null);
      setPendingIsPlaintext(plaintext.ok);
      setRestoreError("");
    } catch {
      toast({ title: "Backup not imported", description: "Could not read the selected file.", variant: "destructive" });
    }
  };

  const previewBackup = async () => {
    if (!pendingText) return;
    setBusy(true);
    setRestoreError("");
    try {
      const backup = await decryptBackupWithPassphrase(pendingText, restorePassphrase);
      setPending(backup);
      setRestorePassphrase("");
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "Could not decrypt this backup.");
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await replaceLocalData(pending);
      toast({ title: "Backup restored" });
      setPending(null);
      setPendingText(null);
      setPendingIsPlaintext(false);
    } catch (e) {
      console.error(e);
      toast({ description: "Import failed. Your existing data was not changed.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const counts = pending ? backupCounts(pending) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="font-semibold">Backup &amp; restore</span><LocalModeBadge /></div>
          <div className="flex items-center gap-1">
            <LocalVaultLockButton />
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="LifeOS home"><Home className="h-5 w-5" /></Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Where your data lives</CardTitle>
            <CardDescription>
              Habits, daily check-ins and journal entries are stored in this browser on this device. Tasks and projects on the LifeOS home are also kept on this device. Planner, goals, diary, ideas and social features are not available in local mode yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm">
            {persisted ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            <span className="flex-1">
              {persisted ? "The browser will keep this data even when storage is low." : "The browser may clear this data when storage is low. Back up regularly."}
            </span>
            {!persisted && (
              <Button size="sm" variant="outline" onClick={async () => setPersisted(await requestPersistentStorage())}>Ask to keep</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>Download a passphrase-encrypted backup of your habits, check-ins, journal, tasks and projects.</CardDescription>
          </CardHeader>
          <CardContent><Button onClick={handleExport} disabled={busy}><Download className="mr-2 h-4 w-4" />Download backup</Button></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore</CardTitle>
            <CardDescription>Restore a passphrase-encrypted HabitFlow backup (up to 10 MB). Nothing changes until you confirm.</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Choose backup file</Button>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!pendingText} onOpenChange={(o) => { if (!o) { setPending(null); setPendingText(null); setPendingIsPlaintext(false); setRestorePassphrase(""); setRestoreError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending ? "Replace your data on this device?" : "Unlock this backup"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `The backup contains ${counts?.habits} habits, ${counts?.records} check-ins, ${counts?.journal} journal entries, ${counts?.tasks} tasks and ${counts?.projects} projects. Your current data will be replaced. ${pendingIsPlaintext ? "This older backup is readable JSON; its validated data will be encrypted when imported." : "Download a backup first if you need one."}`
                : "Enter the passphrase used when this backup was created."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!pending && (
            <div className="space-y-2">
              <Label htmlFor="restore-passphrase">Backup passphrase</Label>
              <Input id="restore-passphrase" type="password" autoComplete="current-password" value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} />
              {restoreError && <p role="alert" className="text-sm text-destructive">{restoreError}</p>}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            {pending
              ? <AlertDialogAction onClick={confirmImport} disabled={busy}>Replace data</AlertDialogAction>
              : <Button onClick={previewBackup} disabled={busy || restorePassphrase.length < 12}><LockKeyhole className="mr-2 h-4 w-4" />Unlock backup</Button>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LocalData;
