import { useState, useEffect, useCallback } from "react";
import { isLocalMode } from "@/lib/appMode";
import { getChallengeStore } from "@/lib/data/challengeStore";
import { useToast } from "@/hooks/use-toast";

export type ChallengeGoalType = "points" | "streak_days" | "habits_completed";

export interface Challenge {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  goal_type: ChallengeGoalType;
  goal_value: number;
  is_public: boolean;
  created_at: string;
  creator_profile?: { display_name: string | null };
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  progress: number;
  joined_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

export interface ChallengeInvite {
  id: string;
  challenge_id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  challenge?: Challenge;
  from_profile?: { display_name: string | null };
}

export interface CreateChallengeInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  goal_type: ChallengeGoalType;
  goal_value: number;
  is_public?: boolean;
}

const getSupabase = async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
};

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participants, setParticipants] = useState<Map<string, ChallengeParticipant[]>>(new Map());
  const [invites, setInvites] = useState<ChallengeInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadChallenges = useCallback(async () => {
    try {
      if (isLocalMode()) {
        const store = await getChallengeStore();
        await store.syncAllProgress();
        const list = await store.listChallenges();
        const challengesWithProfiles: Challenge[] = list.map((c) => ({
          ...c,
          creator_profile: { display_name: "You" },
        }));
        setChallenges(challengesWithProfiles);

        const participantsMap = new Map<string, ChallengeParticipant[]>();
        for (const c of list) {
          const parts = await store.listParticipants(c.id);
          participantsMap.set(
            c.id,
            parts.map((p) => ({
              id: p.id,
              challenge_id: p.challenge_id,
              user_id: p.user_id,
              progress: p.progress,
              joined_at: p.joined_at,
              profile: { display_name: p.profile_name || "You", avatar_url: null },
            }))
          );
        }
        setParticipants(participantsMap);
        return;
      }

      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: participantData, error: participantError } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);

      if (participantError) throw participantError;

      const challengeIds = participantData?.map((p) => p.challenge_id) || [];

      if (challengeIds.length > 0) {
        const { data: challengesData, error: challengesError } = await supabase
          .from("challenges")
          .select("*")
          .in("id", challengeIds)
          .order("start_date", { ascending: false });

        if (challengesError) throw challengesError;

        const creatorIds = [...new Set(challengesData?.map((c) => c.creator_id) || [])];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", creatorIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const challengesWithProfiles = (challengesData || []).map((c) => ({
          ...c,
          goal_type: c.goal_type as ChallengeGoalType,
          creator_profile: profileMap.get(c.creator_id),
        }));

        setChallenges(challengesWithProfiles);

        const participantsMap = new Map<string, ChallengeParticipant[]>();
        for (const challengeId of challengeIds) {
          const { data: participantsData } = await supabase
            .from("challenge_participants")
            .select("*")
            .eq("challenge_id", challengeId)
            .order("progress", { ascending: false });

          if (participantsData && participantsData.length > 0) {
            const userIds = participantsData.map((p) => p.user_id);
            const { data: userProfiles } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", userIds);

            const userProfileMap = new Map(userProfiles?.map((p) => [p.id, p]) || []);
            const withProfiles = participantsData.map((p) => ({
              ...p,
              profile: userProfileMap.get(p.user_id),
            }));
            participantsMap.set(challengeId, withProfiles);
          }
        }
        setParticipants(participantsMap);
      } else {
        setChallenges([]);
        setParticipants(new Map());
      }
    } catch {
      toast({
        description: "Failed to load challenges",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadInvites = useCallback(async () => {
    if (isLocalMode()) {
      setInvites([]);
      return;
    }
    try {
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: invitesData, error } = await supabase
        .from("challenge_invites")
        .select("*")
        .eq("to_user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      if (invitesData && invitesData.length > 0) {
        const challengeIds = [...new Set(invitesData.map((i) => i.challenge_id))];
        const { data: challengesData } = await supabase
          .from("challenges")
          .select("*")
          .in("id", challengeIds);

        const challengeMap = new Map(
          challengesData?.map((c) => [c.id, { ...c, goal_type: c.goal_type as ChallengeGoalType }]) || []
        );

        const fromIds = [...new Set(invitesData.map((i) => i.from_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", fromIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const withDetails = invitesData.map((i) => ({
          ...i,
          status: i.status as "pending" | "accepted" | "rejected",
          challenge: challengeMap.get(i.challenge_id),
          from_profile: profileMap.get(i.from_user_id),
        }));

        setInvites(withDetails);
      } else {
        setInvites([]);
      }
    } catch {
      toast({
        description: "Failed to load challenge invites",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadChallenges(), loadInvites()]);
      setLoading(false);
    };
    loadAll();
  }, [loadChallenges, loadInvites]);

  const createChallenge = async (input: CreateChallengeInput) => {
    try {
      if (isLocalMode()) {
        const store = await getChallengeStore();
        const created = await store.createChallenge(input);
        toast({ title: "Challenge created!" });
        await loadChallenges();
        return created;
      }

      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: challenge, error } = await supabase
        .from("challenges")
        .insert({
          creator_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("challenge_participants").insert({
        challenge_id: challenge.id,
        user_id: user.id,
      });

      toast({ title: "Challenge created!" });
      await loadChallenges();
      return challenge;
    } catch {
      toast({
        description: "Failed to create challenge",
        variant: "destructive",
      });
      return null;
    }
  };

  const inviteFriend = async (challengeId: string, friendId: string) => {
    if (isLocalMode()) {
      toast({ title: "Local Mode", description: "Challenges run directly on this device. Peer sync is available in Data." });
      return;
    }
    try {
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("rate-limited-action", {
        body: {
          action: "challenge_invite",
          data: { challengeId, friendId },
        },
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.rateLimited) {
          throw new Error("Too many invites. Please try again later.");
        }
        throw new Error(data?.error || "Failed to send invite");
      }

      toast({ title: "Invite sent!" });
    } catch (error: any) {
      toast({
        description: error?.message || "Failed to send invite",
        variant: "destructive",
      });
    }
  };

  const acceptInvite = async (inviteId: string, challengeId: string) => {
    if (isLocalMode()) return;
    try {
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("challenge_invites")
        .update({ status: "accepted" })
        .eq("id", inviteId);

      if (updateError) throw updateError;

      const { error: joinError } = await supabase
        .from("challenge_participants")
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      toast({ title: "You joined the challenge!" });
      await Promise.all([loadChallenges(), loadInvites()]);
    } catch {
      toast({
        description: "Failed to accept invite",
        variant: "destructive",
      });
    }
  };

  const rejectInvite = async (inviteId: string) => {
    if (isLocalMode()) return;
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("challenge_invites")
        .update({ status: "rejected" })
        .eq("id", inviteId);

      if (error) throw error;
      toast({ title: "Invite declined" });
      await loadInvites();
    } catch {
      toast({
        description: "Failed to decline invite",
        variant: "destructive",
      });
    }
  };

  const leaveChallenge = async (challengeId: string) => {
    try {
      if (isLocalMode()) {
        const store = await getChallengeStore();
        await store.deleteChallenge(challengeId);
        toast({ title: "Challenge removed" });
        await loadChallenges();
        return;
      }

      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      if (error) throw error;
      toast({ title: "You left the challenge" });
      await loadChallenges();
    } catch {
      toast({
        description: "Failed to leave challenge",
        variant: "destructive",
      });
    }
  };

  const updateProgress = async (challengeId: string, progress: number) => {
    if (isLocalMode()) {
      await loadChallenges();
      return;
    }
    try {
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("challenge_participants")
        .update({ progress })
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      if (error) throw error;
      await loadChallenges();
    } catch {
      toast({
        description: "Failed to update progress",
        variant: "destructive",
      });
    }
  };

  const deleteChallenge = async (challengeId: string) => {
    try {
      if (isLocalMode()) {
        const store = await getChallengeStore();
        await store.deleteChallenge(challengeId);
        toast({ title: "Challenge deleted" });
        await loadChallenges();
        return;
      }

      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: challenge, error: verifyError } = await supabase
        .from("challenges")
        .select("id")
        .eq("id", challengeId)
        .eq("creator_id", user.id)
        .single();

      if (verifyError || !challenge) {
        throw new Error("Not authorized to delete this challenge");
      }

      await supabase.from("challenge_participants").delete().eq("challenge_id", challengeId);
      await supabase.from("challenge_invites").delete().eq("challenge_id", challengeId);
      const { error } = await supabase.from("challenges").delete().eq("id", challengeId).eq("creator_id", user.id);

      if (error) throw error;
      toast({ title: "Challenge deleted" });
      await loadChallenges();
    } catch {
      toast({
        description: "Failed to delete challenge",
        variant: "destructive",
      });
    }
  };

  return {
    challenges,
    participants,
    invites,
    loading,
    createChallenge,
    inviteFriend,
    acceptInvite,
    rejectInvite,
    leaveChallenge,
    updateProgress,
    deleteChallenge,
    refresh: loadChallenges,
  };
};
