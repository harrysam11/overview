import { isLocalMode } from "@/lib/appMode";
import type { LocalChallenge, LocalChallengeParticipant, LocalChallengeGoalType } from "@/lib/local/schema";

export interface ChallengeItem {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  goal_type: LocalChallengeGoalType;
  goal_value: number;
  is_public: boolean;
  created_at: string;
}

export interface ChallengeParticipantItem {
  id: string;
  challenge_id: string;
  user_id: string;
  progress: number;
  joined_at: string;
  profile_name?: string | null;
}

export interface CreateChallengeInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  goal_type: LocalChallengeGoalType;
  goal_value: number;
  is_public?: boolean;
}

export interface ChallengeStore {
  listChallenges(): Promise<ChallengeItem[]>;
  createChallenge(input: CreateChallengeInput): Promise<ChallengeItem>;
  deleteChallenge(id: string): Promise<void>;
  listParticipants(challengeId: string): Promise<ChallengeParticipantItem[]>;
  syncAllProgress(): Promise<void>;
}

export const getChallengeStore = async (): Promise<ChallengeStore> => {
  if (isLocalMode()) {
    const { localChallengeStore } = await import("./localChallengeStore");
    return localChallengeStore;
  }
  const { cloudChallengeStore } = await import("./cloudChallengeStore");
  return cloudChallengeStore;
};
