import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasEncryptedVault, lockLocalVault, unlockLocalVault } from "@/lib/local/vault";

export const LOCAL_VAULT_LOCK_EVENT = "habitflow:lock-local-vault";

const IDLE_LOCK_MS = 10 * 60 * 1000;

export const LocalVaultGate = ({ children }: { children: ReactNode }) => {
  const [checking, setChecking] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    hasEncryptedVault()
      .then((exists) => { if (mounted) setHasVault(exists); })
      .catch(() => { if (mounted) setError("Secure local storage is unavailable in this browser."); })
      .finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, []);

  const lock = useCallback(() => {
    lockLocalVault();
    setUnlocked(false);
    setHasVault(true);
    setPassphrase("");
    setConfirmation("");
    setError("");
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let timeout = window.setTimeout(lock, IDLE_LOCK_MS);
    const refresh = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(lock, IDLE_LOCK_MS);
    };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, refresh, { passive: true }));
    window.addEventListener(LOCAL_VAULT_LOCK_EVENT, lock);
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") lock(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, refresh));
      window.removeEventListener(LOCAL_VAULT_LOCK_EVENT, lock);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [lock, unlocked]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!hasVault && passphrase !== confirmation) {
      setError("The passphrases do not match.");
      return;
    }
    setBusy(true);
    try {
      await unlockLocalVault(passphrase);
      setHasVault(true);
      setUnlocked(true);
      setPassphrase("");
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not unlock local data.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-background" aria-live="polite">Opening secure local storage…</main>;
  if (unlocked) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-muted">
            {hasVault ? <LockKeyhole className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <CardTitle>{hasVault ? "Unlock your local data" : "Protect your local data"}</CardTitle>
          <CardDescription>
            {hasVault
              ? "Enter your passphrase to decrypt data on this device. The passphrase is never saved."
              : "Choose a strong passphrase. It encrypts your data on this device and is required after a reload."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="local-vault-passphrase">Passphrase</Label>
              <Input
                id="local-vault-passphrase"
                type="password"
                autoComplete={hasVault ? "current-password" : "new-password"}
                minLength={12}
                maxLength={1024}
                required
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                autoFocus
              />
              {!hasVault && <p className="text-xs text-muted-foreground">Use at least 12 characters. Keep it safe: forgotten passphrases cannot be recovered.</p>}
            </div>
            {!hasVault && (
              <div className="space-y-2">
                <Label htmlFor="local-vault-confirmation">Confirm passphrase</Label>
                <Input id="local-vault-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Securing your data…" : hasVault ? "Unlock data" : "Encrypt and continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};