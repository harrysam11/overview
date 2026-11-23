import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Upload,
  Home,
  ShieldCheck,
  ShieldAlert,
  LockKeyhole,
  KeyRound,
  CloudDownload,
  Layers,
  RefreshCw,
  HardDrive,
  Info,
  FileText,
} from "lucide-react";
import { downloadEmergencyRecoveryKit } from "@/lib/local/emergencyKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { requestPersistentStorage } from "@/lib/appMode";
import { backupCounts, exportLocalData, parseBackup, replaceLocalData, mergeLocalData } from "@/lib/local/backup";
import { LIMITS, type LocalBackup } from "@/lib/local/schema";
import {
  decryptBackupWithPassphrase,
  exportEncryptedBackup,
  getPassphraseHint,
  setPassphraseHint,
  changePassphrase,
  getLastBackupTime,
} from "@/lib/local/vault";
import { migrateFromCloudAccount } from "@/lib/data/cloudMigration";
import { LocalVaultLockButton } from "@/components/LocalVaultLockButton";

export const LocalData = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Backup & Restore state
  const [pending, setPending] = useState<LocalBackup | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingIsPlaintext, setPendingIsPlaintext] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [busy, setBusy] = useState(false);

  // Storage and Passphrase management state
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [storageUsage, setStorageUsage] = useState<{ usageMb: string; quotaMb: string } | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  // Change Passphrase Dialog state
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [newHint, setNewHint] = useState("");
  const [passError, setPassError] = useState("");

  // Cloud Migration Dialog state
  const [cloudMigrateOpen, setCloudMigrateOpen] = useState(false);
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [cloudMigrateBusy, setCloudMigrateBusy] = useState(false);
  const [cloudMigrateError, setCloudMigrateError] = useState("");

  const refreshMetadata = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.storage) {
        navigator.storage.persisted?.().then(setPersisted).catch(() => setPersisted(null));
        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          const usageMb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
          const quotaMb = ((estimate.quota || 0) / (1024 * 1024 * 1024)).toFixed(1);
          setStorageUsage({ usageMb, quotaMb: `${quotaMb} GB` });
        }
      }
      const savedHint = await getPassphraseHint();
      setHint(savedHint);
      const backupTime = await getLastBackupTime();
      setLastBackup(backupTime);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    refreshMetadata();
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
      setLastBackup(new Date().toISOString());
      toast({
        title: "Encrypted backup downloaded",
        description: `${c.habits} habits, ${c.records} check-ins, ${c.tasks} tasks, ${c.plans} plans, ${c.goals} goals.`,
      });
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

  const confirmReplaceImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await replaceLocalData(pending);
      toast({ title: "Backup restored (Full Replace)" });
      setPending(null);
      setPendingText(null);
      setPendingIsPlaintext(false);
      refreshMetadata();
    } catch (e) {
      console.error(e);
      toast({ description: "Import failed. Your existing data was not changed.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmMergeImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const merged = await mergeLocalData(pending);
      const c = backupCounts(merged);
      toast({
        title: "Cross-Device Sync Complete",
        description: `Successfully merged! Now storing ${c.habits} habits, ${c.records} check-ins, ${c.tasks} tasks.`,
      });
      setPending(null);
      setPendingText(null);
      setPendingIsPlaintext(false);
      refreshMetadata();
    } catch (e) {
      console.error(e);
      toast({ description: "Merge failed. Your existing data was not changed.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassphrase = async () => {
    setPassError("");
    if (newPassphrase.length < 12) {
      setPassError("New passphrase must be at least 12 characters.");
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      setPassError("Passphrases do not match.");
      return;
    }
    setBusy(true);
    try {
      await changePassphrase(newPassphrase, newHint);
      toast({ title: "Passphrase updated", description: "Your local data was re-encrypted with your new passphrase." });
      setChangePassOpen(false);
      setNewPassphrase("");
      setConfirmPassphrase("");
      setNewHint("");
      refreshMetadata();
    } catch (e) {
      setPassError(e instanceof Error ? e.message : "Could not update passphrase.");
    } finally {
      setBusy(false);
    }
  };

  const handleCloudMigration = async () => {
    setCloudMigrateError("");
    if (!cloudEmail || !cloudPassword) {
      setCloudMigrateError("Please enter your cloud email and password.");
      return;
    }
    setCloudMigrateBusy(true);
    try {
      const result = await migrateFromCloudAccount({ email: cloudEmail, password: cloudPassword });
      toast({
        title: "Cloud Migration Successful 🚀",
        description: `Imported ${result.counts.habits} habits, ${result.counts.records} check-ins, ${result.counts.tasks} tasks, ${result.counts.goals} goals into your local encrypted vault!`,
      });
      setCloudMigrateOpen(false);
      setCloudEmail("");
      setCloudPassword("");
      refreshMetadata();
    } catch (e) {
      setCloudMigrateError(e instanceof Error ? e.message : "Cloud migration failed.");
    } finally {
      setCloudMigrateBusy(false);
    }
  };

  const counts = pending ? backupCounts(pending) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold">Local Data &amp; Vault</span>
            <LocalModeBadge />
          </div>
          <div className="flex items-center gap-1">
            <LocalVaultLockButton />
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="LifeOS home">
              <Home className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Storage Health & Persistence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              On-Device Storage Health
            </CardTitle>
            <CardDescription>
              All habits, check-ins, tasks, planner, diary, goals, ideas, and badges are saved in your encrypted IndexedDB vault on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              {persisted ? <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" /> : <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />}
              <div className="flex-1">
                <div className="font-medium">
                  {persisted ? "Persistent Storage Active" : "Storage Eviction Risk"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {persisted
                    ? "The browser has granted persistent storage. Data survives low disk conditions."
                    : "The browser may clear data if disk space gets low. Export regular backups."}
                </div>
              </div>
              {!persisted && (
                <Button size="sm" variant="outline" onClick={async () => setPersisted(await requestPersistentStorage())}>
                  Ask to keep
                </Button>
              )}
            </div>

            {storageUsage && (
              <div className="text-xs text-muted-foreground flex justify-between border-t pt-2">
                <span>Vault size: ~{storageUsage.usageMb} MB</span>
                <span>Available quota: {storageUsage.quotaMb}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passphrase & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Passphrase &amp; Vault Security
            </CardTitle>
            <CardDescription>
              Your local vault key is non-extractable and kept only in memory while unlocked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {hint && (
              <div className="p-2.5 rounded-md bg-muted/60 border text-xs">
                <span className="font-semibold text-foreground">Passphrase Hint:</span> {hint}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setChangePassOpen(true)}>
                Change Passphrase &amp; Hint
              </Button>
              <Button variant="outline" onClick={() => downloadEmergencyRecoveryKit(hint)}>
                <FileText className="h-4 w-4 mr-1.5 text-indigo-500" />
                Emergency Recovery Kit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cross-Device Sync & Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Encrypted Backup
            </CardTitle>
            <CardDescription>
              Download an encrypted backup file of all your data (AES-GCM PBKDF2). Transfer this file to sync with another device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleExport} disabled={busy}>
              <Download className="mr-2 h-4 w-4" />
              Download Backup
            </Button>
            {lastBackup && (
              <p className="text-xs text-muted-foreground">
                Last exported backup: {lastBackup.slice(0, 10)} at {lastBackup.slice(11, 16)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Import & Cross-Device Sync Merge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import or Sync Devices
            </CardTitle>
            <CardDescription>
              Import a backup from this or another device. You can choose to <strong>Sync Merge</strong> (combines habits, check-ins and tasks without erasing anything) or <strong>Replace All Data</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="mr-2 h-4 w-4" />
              Choose Backup File
            </Button>
          </CardContent>
        </Card>

        {/* Cloud Migration Card */}
        <Card className="border-indigo-500/20 bg-indigo-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudDownload className="h-5 w-5 text-indigo-500" />
              Migrate from HabitFlow Cloud
            </CardTitle>
            <CardDescription>
              Import habits, history, journal entries, tasks, goals, and badges from your legacy cloud account directly into your encrypted local vault.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setCloudMigrateOpen(true)}>
              <CloudDownload className="mr-2 h-4 w-4 text-indigo-500" />
              Import from Cloud Account
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Restore & Sync Merge Modal */}
      <AlertDialog
        open={!!pendingText}
        onOpenChange={(o) => {
          if (!o) {
            setPending(null);
            setPendingText(null);
            setPendingIsPlaintext(false);
            setRestorePassphrase("");
            setRestoreError("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{pending ? "Import Backup" : "Unlock This Backup"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? (
                <>
                  Contains {counts?.habits} habits, {counts?.records} check-ins, {counts?.tasks} tasks, {counts?.projects} projects, {counts?.plans ?? 0} plans, {counts?.goals ?? 0} goals, {counts?.diary ?? 0} diary entries, {counts?.ideas ?? 0} ideas, and {counts?.challenges ?? 0} challenges.
                  <div className="mt-3 p-2 bg-muted rounded text-xs text-foreground font-normal">
                    <strong>Sync Merge (Recommended):</strong> Combines data from both devices without losing any habits or checks.
                  </div>
                </>
              ) : (
                "Enter the passphrase used when this backup was created."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!pending && (
            <div className="space-y-2">
              <Label htmlFor="restore-passphrase">Backup passphrase</Label>
              <Input
                id="restore-passphrase"
                type="password"
                autoComplete="current-password"
                value={restorePassphrase}
                onChange={(event) => setRestorePassphrase(event.target.value)}
              />
              {restoreError && <p role="alert" className="text-sm text-destructive">{restoreError}</p>}
            </div>
          )}

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            {pending ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={confirmReplaceImport} disabled={busy} title="Overwrite all data">
                  Replace All
                </Button>
                <Button onClick={confirmMergeImport} disabled={busy} className="bg-primary">
                  <Layers className="h-4 w-4 mr-1" />
                  Sync Merge
                </Button>
              </div>
            ) : (
              <Button onClick={previewBackup} disabled={busy || restorePassphrase.length < 12}>
                <LockKeyhole className="mr-2 h-4 w-4" />
                Unlock Backup
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Passphrase Modal */}
      <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Vault Passphrase</DialogTitle>
            <DialogDescription>
              Your local vault data will be decrypted and re-encrypted with your new passphrase and a fresh cryptographic salt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-passphrase">New passphrase</Label>
              <Input
                id="new-passphrase"
                type="password"
                minLength={12}
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                placeholder="At least 12 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-passphrase">Confirm new passphrase</Label>
              <Input
                id="confirm-passphrase"
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Repeat new passphrase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-hint">Passphrase hint (optional)</Label>
              <Input
                id="new-hint"
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                placeholder="e.g. Favorite street + highschool graduation year"
              />
            </div>
            {passError && <p className="text-sm text-destructive">{passError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePassOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassphrase} disabled={busy || newPassphrase.length < 12}>
              Update Passphrase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cloud Migration Modal */}
      <Dialog open={cloudMigrateOpen} onOpenChange={setCloudMigrateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from HabitFlow Cloud</DialogTitle>
            <DialogDescription>
              Enter your credentials to connect to your legacy cloud account. All records will be validated and merged into your encrypted local vault. The connection is closed immediately afterward.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cloud-email">Cloud Email</Label>
              <Input
                id="cloud-email"
                type="email"
                value={cloudEmail}
                onChange={(e) => setCloudEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloud-password">Cloud Password</Label>
              <Input
                id="cloud-password"
                type="password"
                value={cloudPassword}
                onChange={(e) => setCloudPassword(e.target.value)}
              />
            </div>
            {cloudMigrateError && <p className="text-sm text-destructive">{cloudMigrateError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloudMigrateOpen(false)} disabled={cloudMigrateBusy}>
              Cancel
            </Button>
            <Button onClick={handleCloudMigration} disabled={cloudMigrateBusy || !cloudEmail || !cloudPassword}>
              {cloudMigrateBusy ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Migrating data…
                </>
              ) : (
                "Start Migration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalData;
