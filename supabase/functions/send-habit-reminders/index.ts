import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time in various timezones and find users whose reminder_time matches
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    console.log(`Running habit reminders at UTC ${currentHour}:${currentMinute}`);

    // Get all enabled notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('enabled', true);

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch preferences' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!preferences || preferences.length === 0) {
      console.log('No users with notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let notificationsSent = 0;

    for (const pref of preferences) {
      try {
        // Parse reminder time
        const [reminderHour, reminderMinute] = pref.reminder_time.split(':').map(Number);
        
        // Get timezone offset (simplified - in production use a proper timezone library)
        const timezoneOffset = getTimezoneOffset(pref.timezone);
        const userCurrentHour = (currentHour + timezoneOffset + 24) % 24;

        // Check if it's time to send (within 30 min window to account for cron timing)
        const isTimeToSend = userCurrentHour === reminderHour && 
                            Math.abs(currentMinute - reminderMinute) < 30;

        if (!isTimeToSend) {
          continue;
        }

        // Get user's subscriptions
        const { data: subscriptions } = await supabase
          .from('notification_subscriptions')
          .select('*')
          .eq('user_id', pref.user_id);

        if (!subscriptions || subscriptions.length === 0) {
          continue;
        }

        // Count active habits
        const { count: habitCount } = await supabase
          .from('habits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', pref.user_id)
          .eq('is_active', true);

        // Check today's completions
        const today = new Date().toISOString().split('T')[0];
        const { count: completedCount } = await supabase
          .from('daily_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', pref.user_id)
          .eq('record_date', today)
          .eq('completed', true);

        const remaining = (habitCount || 0) - (completedCount || 0);

        const payload = {
          title: '🎯 HabitFlow Reminder',
          body: remaining > 0 
            ? `Time to track your habits! You have ${remaining} habit${remaining !== 1 ? 's' : ''} left to complete today.`
            : `Great job! You've completed all ${habitCount} habits today! 🎉`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'daily-reminder',
          data: { url: '/' }
        };

        // Send to all subscriptions
        for (const sub of subscriptions) {
          try {
            const response = await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'TTL': '86400',
              },
              body: JSON.stringify(payload),
            });

            if (response.ok || response.status === 201) {
              notificationsSent++;
            } else if (response.status === 404 || response.status === 410) {
              // Remove expired subscription
              await supabase
                .from('notification_subscriptions')
                .delete()
                .eq('id', sub.id);
            }
          } catch (err) {
            console.error('Failed to send notification:', err);
          }
        }
      } catch (err) {
        console.error('Error processing user:', pref.user_id, err);
      }
    }

    console.log(`Sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent,
        usersProcessed: preferences.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in habit reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Simplified timezone offset calculation (hours from UTC)
function getTimezoneOffset(timezone: string): number {
  const offsets: Record<string, number> = {
    'UTC': 0,
    'America/New_York': -5,
    'America/Chicago': -6,
    'America/Denver': -7,
    'America/Los_Angeles': -8,
    'Europe/London': 0,
    'Europe/Paris': 1,
    'Europe/Berlin': 1,
    'Asia/Dubai': 4,
    'Asia/Kolkata': 5.5,
    'Asia/Singapore': 8,
    'Asia/Tokyo': 9,
    'Australia/Sydney': 11,
    'Pacific/Auckland': 13,
  };
  return offsets[timezone] || 0;
}
