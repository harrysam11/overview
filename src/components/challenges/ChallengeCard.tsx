import { useState } from "react";
import { format, isPast, isFuture, isWithinInterval } from "date-fns";
import { Trophy, Users, Calendar, Target, UserPlus, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Challenge, ChallengeParticipant, ChallengeGoalType } from "@/hooks/useChallenges";
import { Friend } from "@/hooks/useFriends";

interface ChallengeCardProps {
  challenge: Challenge;
  participants: ChallengeParticipant[];
  currentUserId: string;
  friends: Friend[];
  onInvite: (challengeId: string, friendId: string) => Promise<void>;
  onLeave: (challengeId: string) => Promise<void>;
}

export const ChallengeCard = ({
  challenge,
  participants,
  currentUserId,
  friends,
  onInvite,
  onLeave,
}: ChallengeCardProps) => {
  const [inviteOpen, setInviteOpen] = useState(false);

  const startDate = new Date(challenge.start_date);
  const endDate = new Date(challenge.end_date);
  const now = new Date();

  const isActive = isWithinInterval(now, { start: startDate, end: endDate });
  const isUpcoming = isFuture(startDate);
  const isEnded = isPast(endDate);

  const isCreator = challenge.creator_id === currentUserId;
  const myParticipation = participants.find(p => p.user_id === currentUserId);

  const getStatusBadge = () => {
    if (isUpcoming) return <Badge variant="secondary">Upcoming</Badge>;
    if (isEnded) return <Badge variant="outline">Ended</Badge>;
    return <Badge className="bg-primary">Active</Badge>;
  };

  const goalTypeLabels: Record<ChallengeGoalType, string> = {
    points: "Points",
    streak_days: "Streak Days",
    habits_completed: "Habits",
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const participantIds = new Set(participants.map(p => p.user_id));
  const availableFriends = friends.filter(f => !participantIds.has(f.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {challenge.name}
            </CardTitle>
            {challenge.description && (
              <p className="text-sm text-muted-foreground">{challenge.description}</p>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Goal */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>{challenge.goal_value} {goalTypeLabels[challenge.goal_type]}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
            </span>
          </div>
        </div>

        {/* My Progress */}
        {myParticipation && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Your Progress</span>
              <span className="font-medium">
                {myParticipation.progress} / {challenge.goal_value}
              </span>
            </div>
            <Progress 
              value={(myParticipation.progress / challenge.goal_value) * 100} 
            />
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Participants ({participants.length})
          </div>
          <div className="space-y-1">
            {participants.slice(0, 5).map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center justify-between text-sm py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-muted-foreground">{index + 1}.</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={participant.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(participant.profile?.display_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={participant.user_id === currentUserId ? "font-medium" : ""}>
                    {participant.profile?.display_name || "Anonymous"}
                    {participant.user_id === currentUserId && " (You)"}
                  </span>
                </div>
                <span className="font-mono">{participant.progress}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {availableFriends.length > 0 && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Friends</DialogTitle>
                  <DialogDescription>
                    Select friends to invite to this challenge
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                  {availableFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(friend.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{friend.display_name || "Anonymous"}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await onInvite(challenge.id, friend.id);
                        }}
                      >
                        Invite
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {!isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onLeave(challenge.id)}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Leave
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
