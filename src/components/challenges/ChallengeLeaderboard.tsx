import { Trophy, Medal, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Challenge, ChallengeParticipant } from "@/hooks/useChallenges";
import { cn } from "@/lib/utils";

interface ChallengeLeaderboardProps {
  challenge: Challenge;
  participants: ChallengeParticipant[];
  currentUserId: string;
}

export const ChallengeLeaderboard = ({
  challenge,
  participants,
  currentUserId,
}: ChallengeLeaderboardProps) => {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-muted-foreground font-mono">{rank}</span>;
    }
  };

  const getRankBgClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/10 border-yellow-500/20";
      case 2:
        return "bg-gray-400/10 border-gray-400/20";
      case 3:
        return "bg-amber-600/10 border-amber-600/20";
      default:
        return "";
    }
  };

  const sortedParticipants = [...participants].sort((a, b) => b.progress - a.progress);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedParticipants.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No participants yet</p>
        ) : (
          sortedParticipants.map((participant, index) => {
            const rank = index + 1;
            const progressPercentage = (participant.progress / challenge.goal_value) * 100;
            const isCurrentUser = participant.user_id === currentUserId;
            const isCompleted = participant.progress >= challenge.goal_value;

            return (
              <div
                key={participant.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  getRankBgClass(rank),
                  isCurrentUser && "ring-2 ring-primary/50"
                )}
              >
                <div className="flex items-center justify-center w-6">
                  {getRankIcon(rank)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={participant.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">
                    {getInitials(participant.profile?.display_name || null)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium truncate", isCurrentUser && "text-primary")}>
                      {participant.profile?.display_name || "Anonymous"}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-green-500 text-xs">Completed</Badge>
                    )}
                  </div>
                  <div className="mt-1">
                    <Progress 
                      value={Math.min(progressPercentage, 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {participant.progress}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    / {challenge.goal_value}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
