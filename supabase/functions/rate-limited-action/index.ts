import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configurations
const RATE_LIMITS = {
  friend_request: { maxRequests: 20, windowMinutes: 60 },     // 20 per hour
  challenge_invite: { maxRequests: 50, windowMinutes: 60 },   // 50 per hour
  user_search: { maxRequests: 60, windowMinutes: 1 },         // 60 per minute
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();
    console.log(`Rate-limited action request: ${action} from user ${user.id}`);

    // Validate action type
    if (!RATE_LIMITS[action as keyof typeof RATE_LIMITS]) {
      console.error(`Invalid action type: ${action}`);
      return new Response(
        JSON.stringify({ error: 'Invalid action type', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rateLimit = RATE_LIMITS[action as keyof typeof RATE_LIMITS];

    // Check rate limit using the database function
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      _user_id: user.id,
      _action_type: action,
      _max_requests: rateLimit.maxRequests,
      _window_minutes: rateLimit.windowMinutes,
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Rate limit check failed', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allowed) {
      console.log(`Rate limit exceeded for user ${user.id} on action ${action}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.', 
          success: false,
          rateLimited: true 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute the action
    let result;
    switch (action) {
      case 'friend_request':
        result = await handleFriendRequest(supabase, user.id, data);
        break;
      case 'challenge_invite':
        result = await handleChallengeInvite(supabase, user.id, data);
        break;
      case 'user_search':
        result = await handleUserSearch(supabase, user.id, data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Action ${action} completed successfully for user ${user.id}`);
    return new Response(
      JSON.stringify({ ...result, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in rate-limited-action function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleFriendRequest(supabase: any, userId: string, data: { toUserId: string }) {
  if (!data.toUserId) {
    throw new Error('toUserId is required');
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.toUserId)) {
    throw new Error('Invalid user ID format');
  }

  const { error } = await supabase
    .from('friend_requests')
    .insert({
      from_user_id: userId,
      to_user_id: data.toUserId,
    });

  if (error) throw error;
  return { message: 'Friend request sent!' };
}

async function handleChallengeInvite(supabase: any, userId: string, data: { challengeId: string; friendId: string }) {
  if (!data.challengeId || !data.friendId) {
    throw new Error('challengeId and friendId are required');
  }

  // Validate UUID formats
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.challengeId) || !uuidRegex.test(data.friendId)) {
    throw new Error('Invalid ID format');
  }

  const { error } = await supabase
    .from('challenge_invites')
    .insert({
      challenge_id: data.challengeId,
      from_user_id: userId,
      to_user_id: data.friendId,
    });

  if (error) throw error;
  return { message: 'Invite sent!' };
}

async function handleUserSearch(supabase: any, userId: string, data: { query: string }) {
  if (!data.query) {
    return { results: [] };
  }

  // Sanitize input: limit length and remove special characters
  const sanitized = data.query.trim().substring(0, 50).replace(/[^a-zA-Z0-9\s_-]/g, '');
  if (sanitized.length < 2) {
    return { results: [] };
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('is_searchable', true)
    .neq('id', userId)
    .ilike('display_name', `%${sanitized}%`)
    .limit(10);

  if (error) throw error;
  return { results: profiles || [] };
}
