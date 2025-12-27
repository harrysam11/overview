import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  from_profile?: { id: string; display_name: string | null; avatar_url: string | null };
  to_profile?: { id: string; display_name: string | null; avatar_url: string | null };
}

export interface Friend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username?: string | null;
}

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFriends = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get accepted friend requests where user is either sender or receiver
      const { data: acceptedRequests, error } = await supabase
        .from("friend_requests")
        .select(`
          id,
          from_user_id,
          to_user_id,
          status,
          created_at
        `)
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (error) throw error;

      // Get friend IDs (the other person in each request)
      const friendIds = (acceptedRequests || []).map(req => 
        req.from_user_id === user.id ? req.to_user_id : req.from_user_id
      );

      if (friendIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, username")
          .in("id", friendIds);

        if (profilesError) throw profilesError;
        setFriends(profiles || []);
      } else {
        setFriends([]);
      }
    } catch (error: any) {
      toast({
        description: "Failed to load friends",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get incoming pending requests
      const { data: incoming, error: incomingError } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("to_user_id", user.id)
        .eq("status", "pending");

      if (incomingError) throw incomingError;

      // Get outgoing pending requests
      const { data: outgoing, error: outgoingError } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("from_user_id", user.id)
        .eq("status", "pending");

      if (outgoingError) throw outgoingError;

      // Fetch profile info for incoming requests
      if (incoming && incoming.length > 0) {
        const fromIds = incoming.map(r => r.from_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", fromIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const withProfiles = incoming.map(r => ({
          ...r,
          status: r.status as "pending" | "accepted" | "rejected",
          from_profile: profileMap.get(r.from_user_id)
        }));
        setIncomingRequests(withProfiles);
      } else {
        setIncomingRequests([]);
      }

      // Fetch profile info for outgoing requests
      if (outgoing && outgoing.length > 0) {
        const toIds = outgoing.map(r => r.to_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", toIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const withProfiles = outgoing.map(r => ({
          ...r,
          status: r.status as "pending" | "accepted" | "rejected",
          to_profile: profileMap.get(r.to_user_id)
        }));
        setOutgoingRequests(withProfiles);
      } else {
        setOutgoingRequests([]);
      }
    } catch (error: any) {
      toast({
        description: "Failed to load friend requests",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadFriends(), loadRequests()]);
      setLoading(false);
    };
    loadAll();
  }, [loadFriends, loadRequests]);

  const sendFriendRequest = async (toUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use rate-limited Edge Function
      const { data, error } = await supabase.functions.invoke('rate-limited-action', {
        body: {
          action: 'friend_request',
          data: { toUserId }
        }
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.rateLimited) {
          throw new Error("Too many requests. Please try again later.");
        }
        throw new Error(data?.error || "Failed to send friend request");
      }

      toast({ title: "Friend request sent!" });
      await loadRequests();
    } catch (error: any) {
      toast({
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;
      toast({ title: "Friend request accepted!" });
      await Promise.all([loadFriends(), loadRequests()]);
    } catch (error: any) {
      toast({
        description: "Failed to accept request",
        variant: "destructive",
      });
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
      toast({ title: "Friend request rejected" });
      await loadRequests();
    } catch (error: any) {
      toast({
        description: "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete the friend request (works for both directions)
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .eq("status", "accepted")
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${user.id})`);

      if (error) throw error;
      toast({ title: "Friend removed" });
      await loadFriends();
    } catch (error: any) {
      toast({
        description: "Failed to remove friend",
        variant: "destructive",
      });
    }
  };

  const searchUsers = async (query: string): Promise<Friend[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Sanitize input: limit length and remove special characters
      const sanitized = query.trim().substring(0, 50).replace(/[^a-zA-Z0-9\s_-]/g, '');
      if (sanitized.length < 2) return [];

      // Use rate-limited Edge Function for server-side protection
      const { data, error } = await supabase.functions.invoke('rate-limited-action', {
        body: {
          action: 'user_search',
          data: { query: sanitized }
        }
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.rateLimited) {
          console.log("Search rate limited");
          return [];
        }
        throw new Error(data?.error || "Search failed");
      }

      return data.results || [];
    } catch (error) {
      return [];
    }
  };

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    searchUsers,
    refresh: () => Promise.all([loadFriends(), loadRequests()]),
  };
};
