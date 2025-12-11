import { useState, useEffect } from 'react';
import { Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface SettingsDialogProps {
  userId: string | undefined;
}

export function SettingsDialog({ userId }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });
  }, []);

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
            Manage your account preferences.
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

          <div className="text-center text-sm text-muted-foreground py-4">
            <p>More settings coming soon!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
