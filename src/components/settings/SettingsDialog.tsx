import { useState, useEffect } from 'react';
import { Settings, Bell, BellOff, Clock, Globe, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';

interface SettingsDialogProps {
  userId: string | undefined;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
];

const REMINDER_TIMES = [
  { value: '06:00:00', label: '6:00 AM' },
  { value: '07:00:00', label: '7:00 AM' },
  { value: '08:00:00', label: '8:00 AM' },
  { value: '09:00:00', label: '9:00 AM' },
  { value: '10:00:00', label: '10:00 AM' },
  { value: '12:00:00', label: '12:00 PM' },
  { value: '18:00:00', label: '6:00 PM' },
  { value: '20:00:00', label: '8:00 PM' },
  { value: '21:00:00', label: '9:00 PM' },
];

export function SettingsDialog({ userId }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    loading,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
  } = useNotifications(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });
  }, []);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account and notification preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{userEmail || 'User'}</p>
              <p className="text-xs text-muted-foreground">Logged in</p>
            </div>
          </div>

          <Separator />

          {/* Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </h3>

            {!isSupported ? (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Push notifications are not supported in your browser.
              </div>
            ) : (
              <>
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      {isSubscribed ? 'Notifications are enabled' : 'Enable daily reminders'}
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={isSubscribed}
                    onCheckedChange={handleToggleNotifications}
                    disabled={loading}
                  />
                </div>

                {/* Permission Status */}
                {permission === 'denied' && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Notifications are blocked in your browser. Please enable them in your browser settings.
                  </div>
                )}

                {/* Settings (only show when subscribed) */}
                {isSubscribed && preferences && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Reminder Time
                      </Label>
                      <Select
                        value={preferences.reminder_time}
                        onValueChange={(value) => updatePreferences({ reminder_time: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REMINDER_TIMES.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Timezone
                      </Label>
                      <Select
                        value={preferences.timezone}
                        onValueChange={(value) => updatePreferences({ timezone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={sendTestNotification}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Test Notification
                    </Button>
                  </>
                )}

                {/* First-time setup prompt */}
                {!isSubscribed && permission !== 'denied' && (
                  <div className="rounded-md bg-primary/10 border border-primary/20 p-4 text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium mb-1">Stay on Track!</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Get daily reminders to track your habits and build consistency.
                    </p>
                    <Button onClick={subscribe} disabled={loading} size="sm">
                      <Bell className="mr-2 h-4 w-4" />
                      Turn On Notifications
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
