import { useState, useEffect } from 'react';
import { Settings, User, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  userId: string | undefined;
}

export function SettingsDialog({ userId }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUsername(profile.username || '');
          setDisplayName(profile.display_name || '');
        }
      }
    };
    if (open) loadProfile();
  }, [open]);

  const handleSave = async () => {
    if (!userId) return;

    // Validate username format
    if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      toast({
        description: 'Username must be 3-30 characters, alphanumeric and underscores only',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: username || null,
        display_name: displayName || null,
      })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          description: 'This username is already taken',
          variant: 'destructive',
        });
      } else {
        toast({
          description: 'Failed to save profile',
          variant: 'destructive',
        });
      }
      return;
    }

    toast({ title: 'Profile updated!' });
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
            Manage your account and profile.
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

          {/* Profile Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                3-30 characters, letters, numbers and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
