import { readVaultData, updateVaultData } from "@/lib/local/vault";
import { newId, nowIso } from "@/lib/local/localDb";
import type { ChallengeStore, ChallengeItem, ChallengeParticipantItem, CreateChallengeInput } from "./challengeStore";
import type { LocalVaultData } from "@/lib/local/schema";

const calculateProgress = (challenge: ChallengeItem, data: LocalVaultData): number => {
  const startDay = challenge.start_date.slice(0, 10);
  const endDay = challenge.end_date.slice(0, 10);

  const relevantRecords = data.daily_records.filter(
    (r) => r.completed && r.record_date >= startDay && r.record_date <= endDay
  );

  if (challenge.goal_type === "habits_completed") {
    return relevantRecords.length;
  }

  if (challenge.goal_type === "points") {
    const habitMap = new Map(data.habits.map((h) => [h.id, h]));
    let points = 0;
    for (const r of relevantRecords) {
      const h = habitMap.get(r.habit_id);
      points += h?.type === "dont" ? 15 : 10;
    }
    const relevantJournals = data.journal_entries.filter(
      (j) => j.entry_date >= startDay && j.entry_date <= endDay
    );
    points += relevantJournals.length * 20;
    return points;
  }

  if (challenge.goal_type === "streak_days") {
    const completedDays = new Set(relevantRecords.map((r) => r.record_date));
    return completedDays.size;
  }

  return 0;
};

export const localChallengeStore: ChallengeStore = {
  async listChallenges(): Promise<ChallengeItem[]> {
    const data = await readVaultData();
    const challenges = data.challenges || [];
    // Ensure all challenges have up-to-date progress
    return challenges;
  },

  async createChallenge(input: CreateChallengeInput): Promise<ChallengeItem> {
    const challengeId = newId();
    const participantId = newId();
    const createdAt = nowIso();

    const newChallenge: ChallengeItem = {
      id: challengeId,
      creator_id: "local-user",
      name: input.name.trim(),
      description: input.description?.trim() || null,
      start_date: input.start_date,
      end_date: input.end_date,
      goal_type: input.goal_type,
      goal_value: input.goal_value,
      is_public: input.is_public ?? false,
      created_at: createdAt,
    };

    await updateVaultData((data) => {
      const progress = calculateProgress(newChallenge, data);
      const participant: ChallengeParticipantItem = {
        id: participantId,
        challenge_id: challengeId,
        user_id: "local-user",
        progress,
        joined_at: createdAt,
        profile_name: data.settings?.display_name || "You",
      };

      return {
        ...data,
        challenges: [newChallenge, ...(data.challenges || [])],
        challenge_participants: [participant, ...(data.challenge_participants || [])],
      };
    });

    return newChallenge;
  },

  async deleteChallenge(id: string): Promise<void> {
    await updateVaultData((data) => ({
      ...data,
      challenges: (data.challenges || []).filter((c) => c.id !== id),
      challenge_participants: (data.challenge_participants || []).filter((p) => p.challenge_id !== id),
    }));
  },

  async listParticipants(challengeId: string): Promise<ChallengeParticipantItem[]> {
    const data = await readVaultData();
    const participants = (data.challenge_participants || []).filter((p) => p.challenge_id === challengeId);
    // Refresh local-user progress
    const challenge = (data.challenges || []).find((c) => c.id === challengeId);
    if (challenge) {
      const currentProgress = calculateProgress(challenge, data);
      return participants.map((p) =>
        p.user_id === "local-user" ? { ...p, progress: currentProgress } : p
      );
    }
    return participants;
  },

  async syncAllProgress(): Promise<void> {
    await updateVaultData((data) => {
      const challenges = data.challenges || [];
      const challengeMap = new Map(challenges.map((c) => [c.id, c]));

      const updatedParticipants = (data.challenge_participants || []).map((p) => {
        if (p.user_id === "local-user") {
          const c = challengeMap.get(p.challenge_id);
          if (c) {
            return { ...p, progress: calculateProgress(c, data) };
          }
        }
        return p;
      });

      return {
        ...data,
        challenge_participants: updatedParticipants,
      };
    });
  },
};
