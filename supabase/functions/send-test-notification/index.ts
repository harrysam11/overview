import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, char => char.charCodeAt(0));
}

// Simple web push implementation
async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const body = JSON.stringify(payload);
  
  // For now, use a simple fetch to the push endpoint
  // In production, you'd want to use proper VAPID signing
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: body,
  });

  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get user's subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No notification subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Count active habits
    const { count: habitCount } = await supabase
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    const payload = {
      title: '🎯 HabitFlow Test',
      body: `This is a test notification! You have ${habitCount || 0} active habits to track today.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification',
      data: { url: '/' }
    };

    console.log(`Sending test notification to ${subscriptions.length} subscription(s)`);

    // Send to all subscriptions (browsers handle deduplication)
    let successCount = 0;
    for (const sub of subscriptions) {
      try {
        // Use the Fetch API to send a simple push
        // Note: This is a simplified implementation
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok || response.status === 201) {
          successCount++;
          console.log('Push sent successfully to:', sub.endpoint.substring(0, 50));
        } else {
          console.log('Push failed with status:', response.status);
          // Remove invalid subscription
          if (response.status === 404 || response.status === 410) {
            await supabase
              .from('notification_subscriptions')
              .delete()
              .eq('id', sub.id);
            console.log('Removed invalid subscription');
          }
        }
      } catch (err) {
        console.error('Failed to send to subscription:', err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test notification sent to ${successCount}/${subscriptions.length} device(s)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error sending test notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
