import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseRealtimeNotificationsOptions {
  userId: string | null;
  onFriendRequest?: () => void;
  onChallengeInvite?: () => void;
}

export const useRealtimeNotifications = ({
  userId,
  onFriendRequest,
  onChallengeInvite,
}: UseRealtimeNotificationsOptions) => {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchSenderName = useCallback(async (senderId: string): Promise<string> => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", senderId)
      .single();
    return data?.display_name || "Someone";
  }, []);

  const fetchChallengeName = useCallback(async (challengeId: string): Promise<string> => {
    const { data } = await supabase
      .from("challenges")
      .select("name")
      .eq("id", challengeId)
      .single();
    return data?.name || "a challenge";
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Create a single channel for all notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friend_requests",
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          const senderName = await fetchSenderName(payload.new.from_user_id);
          toast({
            title: "New Friend Request",
            description: `${senderName} sent you a friend request`,
          });
          onFriendRequest?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friend_requests",
          filter: `from_user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.new.status === "accepted") {
            const friendName = await fetchSenderName(payload.new.to_user_id);
            toast({
              title: "Friend Request Accepted",
              description: `${friendName} accepted your friend request`,
            });
            onFriendRequest?.();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_invites",
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          const [senderName, challengeName] = await Promise.all([
            fetchSenderName(payload.new.from_user_id),
            fetchChallengeName(payload.new.challenge_id),
          ]);
          toast({
            title: "New Challenge Invite",
            description: `${senderName} invited you to "${challengeName}"`,
          });
          onChallengeInvite?.();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, onFriendRequest, onChallengeInvite, toast, fetchSenderName, fetchChallengeName]);

  return null;
};
