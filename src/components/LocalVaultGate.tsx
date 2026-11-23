import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPassphraseHint, hasEncryptedVault, lockLocalVault, unlockLocalVault } from "@/lib/local/vault";
import { evaluatePassphraseStrength } from "@/lib/local/emergencyKit";

export const LOCAL_VAULT_LOCK_EVENT = "habitflow:lock-local-vault";
const LOCK_SIGNAL_KEY = "habitflow-local-vault-lock-signal";
const IDLE_LOCK_STORAGE_KEY = "habitflow-idle-lock-minutes";

const DEFAULT_IDLE_MINUTES = 10;

export const LocalVaultGate = ({ children }: { children: ReactNode }) => {
  const [checking, setChecking] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [newHint, setNewHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const strength = evaluatePassphraseStrength(passphrase);

  // Security hardening: brute-force throttling
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Security hardening: configurable idle lock
  const [idleMinutes, setIdleMinutes] = useState<number>(() => {
    try {
      const saved = window.localStorage.getItem(IDLE_LOCK_STORAGE_KEY);
      return saved ? Math.max(1, parseInt(saved, 10)) : DEFAULT_IDLE_MINUTES;
    } catch {
      return DEFAULT_IDLE_MINUTES;
    }
  });

  const handleIdleMinutesChange = (minutes: number) => {
    setIdleMinutes(minutes);
    try {
      window.localStorage.setItem(IDLE_LOCK_STORAGE_KEY, String(minutes));
    } catch {}
  };

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutRemaining]);

  useEffect(() => {
    let mounted = true;
    hasEncryptedVault()
      .then(async (exists) => {
        if (mounted) {
          setHasVault(exists);
          if (exists) {
            const savedHint = await getPassphraseHint();
            if (mounted) setHint(savedHint);
          }
        }
      })
      .catch(() => { if (mounted) setError("Secure local storage is unavailable in this browser."); })
      .finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, []);

  const clearUnlockedState = useCallback(() => {
    lockLocalVault();
    setUnlocked(false);
    setHasVault(true);
    setPassphrase("");
    setConfirmation("");
    setError("");
  }, []);

  const lock = useCallback(() => {
    try {
      window.localStorage.setItem(LOCK_SIGNAL_KEY, String(Date.now()));
    } catch {
      // Locking the current tab must still work when localStorage is unavailable.
    }
    clearUnlockedState();
  }, [clearUnlockedState]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCK_SIGNAL_KEY) clearUnlockedState();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearUnlockedState]);

  useEffect(() => {
    if (!unlocked) return;
    const idleMs = idleMinutes * 60 * 1000;
    let timeout = window.setTimeout(lock, idleMs);
    const refresh = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(lock, idleMs);
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
  }, [lock, unlocked, idleMinutes]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lockoutRemaining > 0) return;

    setError("");
    if (!hasVault && passphrase !== confirmation) {
      setError("The passphrases do not match.");
      return;
    }
    setBusy(true);
    try {
      await unlockLocalVault(passphrase, !hasVault ? newHint : undefined);
      setHasVault(true);
      setUnlocked(true);
      setPassphrase("");
      setConfirmation("");
      setNewHint("");
      setFailedAttempts(0);
      setLockoutRemaining(0);
    } catch (cause) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= 3) {
        // Exponential backoff: 3rd fail -> 2s, 4th -> 4s, 5th -> 8s, up to 60s
        const penalty = Math.min(60, Math.pow(2, nextFailed - 2));
        setLockoutRemaining(penalty);
      }
      setError(cause instanceof Error ? cause.message : "Could not unlock local data.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-background" aria-live="polite">Opening secure local storage…</main>;
  if (unlocked) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border-border">
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
                disabled={lockoutRemaining > 0}
              />
              {!hasVault && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Strength:</span>
                    <span className={`font-semibold ${
                      strength.score <= 1
                        ? "text-red-500"
                        : strength.score === 2
                        ? "text-amber-500"
                        : strength.score === 3
                        ? "text-emerald-500"
                        : "text-emerald-600 font-bold"
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1.5">
                    <div className={`rounded-full ${strength.score >= 1 ? (strength.score === 1 ? "bg-red-500" : "bg-emerald-500") : "bg-muted"}`} />
                    <div className={`rounded-full ${strength.score >= 2 ? (strength.score === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-muted"}`} />
                    <div className={`rounded-full ${strength.score >= 3 ? "bg-emerald-500" : "bg-muted"}`} />
                    <div className={`rounded-full ${strength.score >= 4 ? "bg-emerald-600" : "bg-muted"}`} />
                  </div>
                  {strength.feedback[0] && (
                    <p className="text-[11px] text-muted-foreground">{strength.feedback[0]}</p>
                  )}
                </div>
              )}
            </div>

            {hasVault && hint && (
              <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground border">
                <span className="font-semibold text-foreground">Passphrase Hint:</span> {hint}
              </div>
            )}

            {!hasVault && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="local-vault-confirmation">Confirm passphrase</Label>
                  <Input id="local-vault-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="local-vault-new-hint">Passphrase hint (optional)</Label>
                  <Input id="local-vault-new-hint" placeholder="e.g. Favorite book + lucky number" value={newHint} onChange={(event) => setNewHint(event.target.value)} />
                  <p className="text-xs text-muted-foreground">Shown on the unlock screen if you ever forget your passphrase.</p>
                </div>
              </>
            )}

            {/* Lockout warning */}
            {lockoutRemaining > 0 && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Too many failed attempts. Unlock is temporarily throttled for <strong>{lockoutRemaining}s</strong>.</span>
              </div>
            )}

            {error && lockoutRemaining === 0 && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy || lockoutRemaining > 0}>
              {lockoutRemaining > 0
                ? `Throttled (${lockoutRemaining}s)`
                : busy
                ? "Securing your data…"
                : hasVault
                ? "Unlock data"
                : "Encrypt and continue"}
            </Button>

            {/* Security settings: Auto-lock duration */}
            <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Auto-lock when idle:
              </span>
              <select
                value={idleMinutes}
                onChange={(e) => handleIdleMinutesChange(Number(e.target.value))}
                className="bg-transparent border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};