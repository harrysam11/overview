import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  enabled: boolean;
  reminder_time: string;
  timezone: string;
}

export function useNotifications(userId: string | undefined) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load preferences and subscription status
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        // Load preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (prefs) {
          setPreferences({
            enabled: prefs.enabled,
            reminder_time: prefs.reminder_time,
            timezone: prefs.timezone,
          });
        }

        // Check if subscribed
        const { count } = await supabase
          .from('notification_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        setIsSubscribed((count || 0) > 0);
      } catch (err) {
        console.error('Error loading notification data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  // Register service worker and subscribe to push
  const subscribe = useCallback(async () => {
    if (!userId || !isSupported) return false;

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Generate a simple application server key (in production, use VAPID from server)
      // For now, we'll use the subscription without VAPID for demo purposes
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      const subscriptionJson = subscription.toJSON();

      // Save subscription to database
      const { error } = await supabase
        .from('notification_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscriptionJson.endpoint!,
          p256dh_key: subscriptionJson.keys?.p256dh || '',
          auth_key: subscriptionJson.keys?.auth || '',
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      // Create default preferences if not exists
      const { error: prefError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          enabled: true,
          reminder_time: '09:00:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }, {
          onConflict: 'user_id',
        });

      if (prefError) throw prefError;

      setIsSubscribed(true);
      setPreferences({
        enabled: true,
        reminder_time: '09:00:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });

      toast({
        title: 'Notifications enabled',
        description: 'You will receive daily habit reminders.',
      });

      return true;
    } catch (err) {
      console.error('Error subscribing to notifications:', err);
      toast({
        title: 'Failed to enable notifications',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      return false;
    }
  }, [userId, isSupported, toast]);

  // Unsubscribe from push
  const unsubscribe = useCallback(async () => {
    if (!userId) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      await supabase
        .from('notification_subscriptions')
        .delete()
        .eq('user_id', userId);

      setIsSubscribed(false);

      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications.',
      });
    } catch (err) {
      console.error('Error unsubscribing:', err);
    }
  }, [userId, toast]);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update(newPrefs)
        .eq('user_id', userId);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);

      toast({
        title: 'Settings updated',
        description: 'Your notification preferences have been saved.',
      });
    } catch (err) {
      console.error('Error updating preferences:', err);
      toast({
        title: 'Failed to update settings',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [userId, toast]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('send-test-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Test notification sent',
        description: 'Check your device for the notification.',
      });
    } catch (err) {
      console.error('Error sending test notification:', err);
      toast({
        title: 'Failed to send test',
        description: 'Make sure notifications are enabled.',
        variant: 'destructive',
      });
    }
  }, [userId, toast]);

  return {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    loading,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
