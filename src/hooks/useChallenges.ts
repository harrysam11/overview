import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participants, setParticipants] = useState<Map<string, ChallengeParticipant[]>>(new Map());
  const [invites, setInvites] = useState<ChallengeInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadChallenges = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get challenges user participates in
      const { data: participantData, error: participantError } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);

      if (participantError) throw participantError;

      const challengeIds = participantData?.map(p => p.challenge_id) || [];

      if (challengeIds.length > 0) {
        const { data: challengesData, error: challengesError } = await supabase
          .from("challenges")
          .select("*")
          .in("id", challengeIds)
          .order("start_date", { ascending: false });

        if (challengesError) throw challengesError;

        // Get creator profiles
        const creatorIds = [...new Set(challengesData?.map(c => c.creator_id) || [])];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", creatorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const challengesWithProfiles = (challengesData || []).map(c => ({
          ...c,
          goal_type: c.goal_type as ChallengeGoalType,
          creator_profile: profileMap.get(c.creator_id)
        }));

        setChallenges(challengesWithProfiles);

        // Load participants for each challenge
        const participantsMap = new Map<string, ChallengeParticipant[]>();
        for (const challengeId of challengeIds) {
          const { data: participantsData } = await supabase
            .from("challenge_participants")
            .select("*")
            .eq("challenge_id", challengeId)
            .order("progress", { ascending: false });

          if (participantsData && participantsData.length > 0) {
            const userIds = participantsData.map(p => p.user_id);
            const { data: userProfiles } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", userIds);

            const userProfileMap = new Map(userProfiles?.map(p => [p.id, p]) || []);
            const withProfiles = participantsData.map(p => ({
              ...p,
              profile: userProfileMap.get(p.user_id)
            }));
            participantsMap.set(challengeId, withProfiles);
          }
        }
        setParticipants(participantsMap);
      } else {
        setChallenges([]);
      }
    } catch (error: any) {
      toast({
        description: "Failed to load challenges",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadInvites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: invitesData, error } = await supabase
        .from("challenge_invites")
        .select("*")
        .eq("to_user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      if (invitesData && invitesData.length > 0) {
        // Get challenge details
        const challengeIds = [...new Set(invitesData.map(i => i.challenge_id))];
        const { data: challengesData } = await supabase
          .from("challenges")
          .select("*")
          .in("id", challengeIds);

        const challengeMap = new Map(challengesData?.map(c => [c.id, { ...c, goal_type: c.goal_type as ChallengeGoalType }]) || []);

        // Get sender profiles
        const fromIds = [...new Set(invitesData.map(i => i.from_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", fromIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const withDetails = invitesData.map(i => ({
          ...i,
          status: i.status as "pending" | "accepted" | "rejected",
          challenge: challengeMap.get(i.challenge_id),
          from_profile: profileMap.get(i.from_user_id)
        }));

        setInvites(withDetails);
      } else {
        setInvites([]);
      }
    } catch (error: any) {
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

      // Auto-join creator as participant
      await supabase
        .from("challenge_participants")
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
        });

      toast({ title: "Challenge created!" });
      await loadChallenges();
      return challenge;
    } catch (error: any) {
      toast({
        description: error.message || "Failed to create challenge",
        variant: "destructive",
      });
      return null;
    }
  };

  const inviteFriend = async (challengeId: string, friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("challenge_invites")
        .insert({
          challenge_id: challengeId,
          from_user_id: user.id,
          to_user_id: friendId,
        });

      if (error) throw error;
      toast({ title: "Invite sent!" });
    } catch (error: any) {
      toast({
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    }
  };

  const acceptInvite = async (inviteId: string, challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update invite status
      const { error: updateError } = await supabase
        .from("challenge_invites")
        .update({ status: "accepted" })
        .eq("id", inviteId);

      if (updateError) throw updateError;

      // Join challenge
      const { error: joinError } = await supabase
        .from("challenge_participants")
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      toast({ title: "You joined the challenge!" });
      await Promise.all([loadChallenges(), loadInvites()]);
    } catch (error: any) {
      toast({
        description: "Failed to accept invite",
        variant: "destructive",
      });
    }
  };

  const rejectInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("challenge_invites")
        .update({ status: "rejected" })
        .eq("id", inviteId);

      if (error) throw error;
      toast({ title: "Invite declined" });
      await loadInvites();
    } catch (error: any) {
      toast({
        description: "Failed to decline invite",
        variant: "destructive",
      });
    }
  };

  const leaveChallenge = async (challengeId: string) => {
    try {
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
    } catch (error: any) {
      toast({
        description: "Failed to leave challenge",
        variant: "destructive",
      });
    }
  };

  const updateProgress = async (challengeId: string, progress: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("challenge_participants")
        .update({ progress })
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      if (error) throw error;
      await loadChallenges();
    } catch (error: any) {
      toast({
        description: "Failed to update progress",
        variant: "destructive",
      });
    }
  };

  const deleteChallenge = async (challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete participants first
      await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId);

      // Delete invites
      await supabase
        .from("challenge_invites")
        .delete()
        .eq("challenge_id", challengeId);

      // Delete challenge
      const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challengeId)
        .eq("creator_id", user.id);

      if (error) throw error;
      toast({ title: "Challenge deleted" });
      await loadChallenges();
    } catch (error: any) {
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
    deleteChallenge,
    updateProgress,
    refresh: () => Promise.all([loadChallenges(), loadInvites()]),
  };
};
