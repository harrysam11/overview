import { useEffect, useState } from "react";
import {
  Smartphone,
  Laptop,
  Download,
  Share2,
  CheckCircle2,
  PlusSquare,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallAppDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InstallAppDialog({ trigger, open, onOpenChange }: InstallAppDialogProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");

  useEffect(() => {
    // Detect OS for default tab
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if already in standalone display mode (PWA installed)
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    // Listen for browser install prompt
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Install & Download HabitFlow</DialogTitle>
              <DialogDescription className="text-xs">
                Zero app store fees. Works 100% offline with encrypted on-device storage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isInstalled ? (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2 my-2">
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              HabitFlow is already installed on this device!
            </div>
            <p className="text-xs text-muted-foreground">
              You are running the standalone application with offline support and local storage.
            </p>
          </div>
        ) : deferredPrompt ? (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3 my-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-amber-500" />
              1-Click Direct Installation Available
            </div>
            <p className="text-xs text-muted-foreground">
              Your browser supports direct installation. Click below to install HabitFlow onto your home screen or desktop.
            </p>
            <Button onClick={handleInstallClick} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Install HabitFlow App Now
            </Button>
          </div>
        ) : null}

        <Tabs defaultValue={platform} className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="android" className="text-xs gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              Android
            </TabsTrigger>
            <TabsTrigger value="ios" className="text-xs gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              iOS (iPhone)
            </TabsTrigger>
            <TabsTrigger value="desktop" className="text-xs gap-1.5">
              <Laptop className="h-3.5 w-3.5" />
              Desktop & Docker
            </TabsTrigger>
          </TabsList>

          {/* Android Tab */}
          <TabsContent value="android" className="space-y-4 pt-3 text-xs">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Option 1: Progressive Web App (Instant Install)
              </h4>
              <p className="text-muted-foreground">
                In Google Chrome, Brave, or Samsung Internet on your phone:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground pl-1">
                <li>Tap the <strong>three dots menu (⋮)</strong> in the top right.</li>
                <li>Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>HabitFlow installs as a full-screen standalone application with an offline cache.</li>
              </ol>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-500" />
                Option 2: Native Android APK (Capacitor)
              </h4>
              <p className="text-muted-foreground">
                To build a standalone signed <code>.apk</code> for Android using Capacitor:
              </p>
              <pre className="p-2 bg-muted rounded font-mono text-[11px] overflow-x-auto">
{`npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init HabitFlow com.habitflow.lifeos
npm run build
npx cap add android
npx cap open android`}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                This compiles directly into an Android Studio project to generate an APK or publish to the Google Play Store.
              </p>
            </div>
          </TabsContent>

          {/* iOS Tab */}
          <TabsContent value="ios" className="space-y-4 pt-3 text-xs">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                Instant iPhone & iPad Installation (Safari)
              </h4>
              <p className="text-muted-foreground">
                Apple requires installing via Safari to get full offline and standalone display support:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-1">
                <li>
                  Open your self-hosted URL in <strong>Safari</strong> on your iPhone or iPad.
                </li>
                <li className="flex items-center gap-1.5 flex-wrap">
                  Tap the <strong>Share</strong> button <Share2 className="h-3.5 w-3.5 inline text-primary" /> in the bottom toolbar.
                </li>
                <li className="flex items-center gap-1.5 flex-wrap">
                  Scroll down and tap <PlusSquare className="h-3.5 w-3.5 inline text-primary" /> <strong>"Add to Home Screen"</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> in the top right corner.
                </li>
              </ol>
              <div className="p-2 rounded bg-primary/5 text-[11px] text-muted-foreground">
                <strong>Offline Guarantee:</strong> Once added, HabitFlow launches without browser chrome, uses IndexedDB on-device encryption, and works with no internet connection.
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <h4 className="font-semibold text-sm">Native iOS App (Xcode / Capacitor)</h4>
              <pre className="p-2 bg-muted rounded font-mono text-[11px] overflow-x-auto">
{`npm install @capacitor/ios
npx cap add ios
npx cap open ios`}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Opens Xcode to build an <code>.ipa</code> or deploy directly to your iPhone via TestFlight.
              </p>
            </div>
          </TabsContent>

          {/* Desktop & Docker Tab */}
          <TabsContent value="desktop" className="space-y-4 pt-3 text-xs">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Laptop className="h-4 w-4 text-emerald-500" />
                Desktop PWA App (Chrome, Edge, Brave)
              </h4>
              <p className="text-muted-foreground">
                Click the <strong>Install</strong> icon in your browser's address bar (or Menu $\rightarrow$ "Install HabitFlow") to run as a dedicated desktop app on Linux, macOS, or Windows.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-500" />
                Run via Docker (Home Server / NAS / Raspberry Pi)
              </h4>
              <pre className="p-2 bg-muted rounded font-mono text-[11px] overflow-x-auto">
{`# One command deployment:
docker compose up -d`}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Runs on port <code>8080</code>. Accessible across your local Wi-Fi, Tailscale, or WireGuard network.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
