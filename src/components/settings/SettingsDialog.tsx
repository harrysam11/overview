import { useState, useEffect } from "react";
import { Settings, User, Loader2, Check, Bell, Bot, FileText } from "lucide-react";
import { downloadEmergencyRecoveryKit } from "@/lib/local/emergencyKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { isLocalMode } from "@/lib/appMode";
import { getSettingsStore } from "@/lib/data/settingsStore";
import {
  getNotificationSettings,
  updateNotificationSettings,
  requestBrowserNotificationPermission,
  showLocalNotification,
} from "@/lib/local/notifications";
import { getAiSettings, updateAiSettings } from "@/lib/ai/ollamaClient";

interface SettingsDialogProps {
  userId?: string | undefined;
}

export function SettingsDialog({ userId: _userId }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  // Notification state
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [morningTime, setMorningTime] = useState("08:00");
  const [eveningTime, setEveningTime] = useState("21:00");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  // AI state
  const [aiEndpoint, setAiEndpoint] = useState("http://127.0.0.1:11434");
  const [aiModel, setAiModel] = useState("llama3");
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, [open]);

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        const store = await getSettingsStore();
        const settings = await store.getSettings();
        setUserEmail(settings.email || (isLocalMode ? "Local Vault" : null));
        setUsername(settings.username || "");
        setDisplayName(settings.display_name || "");

        if (isLocalMode) {
          const notif = await getNotificationSettings();
          setNotifEnabled(notif.enabled);
          setMorningTime(notif.morning_time || "08:00");
          setEveningTime(notif.evening_time || "21:00");

          const ai = await getAiSettings();
          setAiEndpoint(ai.endpoint);
          setAiModel(ai.model);
          setAiSystemPrompt(ai.system_prompt);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    if (open) loadAllSettings();
  }, [open]);

  const handleSaveProfile = async () => {
    if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      toast({
        description: "Username must be 3-30 characters, alphanumeric and underscores only",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const store = await getSettingsStore();
      await store.saveSettings({
        username: username || null,
        display_name: displayName || null,
      });
      toast({ title: "Profile updated!" });
    } catch (error: any) {
      if (error?.code === "23505") {
        toast({
          description: "This username is already taken",
          variant: "destructive",
        });
      } else {
        toast({
          description: "Failed to save profile",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings({
        enabled: notifEnabled,
        morning_time: morningTime,
        evening_time: eveningTime,
      });
      toast({ title: "Notification preferences saved!" });
    } catch {
      toast({ description: "Failed to save notification settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      setNotifPermission("granted");
      setNotifEnabled(true);
      await updateNotificationSettings({ enabled: true });
      showLocalNotification("HabitFlow Notifications Active 🔔", "You will receive timely habit check-in reminders.");
      toast({ title: "Notifications enabled!" });
    } else {
      setNotifPermission(Notification.permission);
      toast({ description: "Notification permission was denied in your browser.", variant: "destructive" });
    }
  };

  const handleTestNotification = () => {
    const sent = showLocalNotification(
      "HabitFlow Test Reminder 🔔",
      "Local browser notifications are functioning properly offline!"
    );
    if (!sent) {
      toast({
        description: "Please grant browser notification permission first.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAi = async () => {
    setSaving(true);
    try {
      await updateAiSettings({
        endpoint: aiEndpoint.trim() || "http://127.0.0.1:11434",
        model: aiModel.trim() || "llama3",
        system_prompt: aiSystemPrompt.trim(),
      });
      toast({ title: "Local AI settings saved!" });
    } catch {
      toast({ description: "Failed to save AI settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            {isLocalMode
              ? "Preferences and offline tools stored in your encrypted vault."
              : "Manage your account and profile."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs">Reminders</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">Local AI</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 pt-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{userEmail || (isLocalMode ? "Local User" : "User")}</p>
                <p className="text-xs text-muted-foreground">{isLocalMode ? "Offline encrypted vault" : "Logged in"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs">Username</Label>
                <Input
                  id="username"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  maxLength={30}
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  3-30 characters, letters, numbers and underscores only
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                  className="h-8 text-xs"
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full h-8 text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Save Profile
              </Button>

              {isLocalMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadEmergencyRecoveryKit()}
                  className="w-full h-8 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                  Download Emergency Recovery Kit
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4 pt-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Browser Notifications</Label>
                <p className="text-[11px] text-muted-foreground">
                  Status: {notifPermission === "granted" ? "Allowed" : notifPermission === "denied" ? "Blocked in browser" : "Not requested"}
                </p>
              </div>
              {notifPermission !== "granted" ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRequestPermission}>
                  <Bell className="h-3.5 w-3.5 mr-1" />
                  Grant Permission
                </Button>
              ) : (
                <Switch checked={notifEnabled} onCheckedChange={setNotifEnabled} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="morning-time" className="text-xs">Morning Reminder</Label>
                <Input
                  id="morning-time"
                  type="time"
                  value={morningTime}
                  onChange={(e) => setMorningTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evening-time" className="text-xs">Evening Check-in</Label>
                <Input
                  id="evening-time"
                  type="time"
                  value={eveningTime}
                  onChange={(e) => setEveningTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTestNotification} variant="outline" className="flex-1 h-8 text-xs">
                Send Test Notification
              </Button>
              <Button onClick={handleSaveNotifications} disabled={saving} className="flex-1 h-8 text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Save Reminders
              </Button>
            </div>
          </TabsContent>

          {/* Local AI Tab */}
          <TabsContent value="ai" className="space-y-4 pt-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ai-endpoint" className="text-xs">Ollama Daemon Endpoint</Label>
                <Input
                  id="ai-endpoint"
                  value={aiEndpoint}
                  onChange={(e) => setAiEndpoint(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">Default is http://127.0.0.1:11434</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-model" className="text-xs">Model Identifier</Label>
                <Input
                  id="ai-model"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="llama3, mistral, or phi3"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-system" className="text-xs">Habit Coach System Prompt</Label>
                <Textarea
                  id="ai-system"
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <Button onClick={handleSaveAi} disabled={saving} className="w-full h-8 text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Save AI Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
