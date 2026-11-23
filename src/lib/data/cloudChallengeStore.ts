import type { ChallengeStore, ChallengeItem, ChallengeParticipantItem, CreateChallengeInput } from "./challengeStore";

const getClient = async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
};

export const cloudChallengeStore: ChallengeStore = {
  async listChallenges(): Promise<ChallengeItem[]> {
    const supabase = await getClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: participantData } = await supabase
      .from("challenge_participants")
      .select("challenge_id")
      .eq("user_id", user.id);

    const challengeIds = participantData?.map((p) => p.challenge_id) || [];
    if (challengeIds.length === 0) return [];

    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .in("id", challengeIds)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as ChallengeItem[];
  },

  async createChallenge(input: CreateChallengeInput): Promise<ChallengeItem> {
    const supabase = await getClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be signed in to create cloud challenge");

    const { data, error } = await supabase
      .from("challenges")
      .insert({
        creator_id: user.id,
        name: input.name,
        description: input.description || null,
        start_date: input.start_date,
        end_date: input.end_date,
        goal_type: input.goal_type,
        goal_value: input.goal_value,
        is_public: input.is_public ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("challenge_participants").insert({
      challenge_id: data.id,
      user_id: user.id,
      progress: 0,
    });

    return data as unknown as ChallengeItem;
  },

  async deleteChallenge(id: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) throw error;
  },

  async listParticipants(challengeId: string): Promise<ChallengeParticipantItem[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from("challenge_participants")
      .select("*, profile:profiles(display_name)")
      .eq("challenge_id", challengeId);

    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id,
      challenge_id: p.challenge_id,
      user_id: p.user_id,
      progress: p.progress,
      joined_at: p.joined_at,
      profile_name: p.profile?.display_name || null,
    }));
  },

  async syncAllProgress(): Promise<void> {
    // Cloud uses Edge functions or client challenge progress sync
  },
};
