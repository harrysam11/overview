import { useState } from "react";
import { format } from "date-fns";
import { Check, X, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeInvite } from "@/hooks/useChallenges";

interface ChallengeInvitesProps {
  invites: ChallengeInvite[];
  onAccept: (inviteId: string, challengeId: string) => Promise<void>;
  onReject: (inviteId: string) => Promise<void>;
}

export const ChallengeInvites = ({
  invites,
  onAccept,
  onReject,
}: ChallengeInvitesProps) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (inviteId: string, challengeId: string) => {
    setProcessingId(inviteId);
    await onAccept(inviteId, challengeId);
    setProcessingId(null);
  };

  const handleReject = async (inviteId: string) => {
    setProcessingId(inviteId);
    await onReject(inviteId);
    setProcessingId(null);
  };

  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Challenge Invites ({invites.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="p-3 rounded-lg bg-muted/50 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{invite.challenge?.name}</p>
                <p className="text-sm text-muted-foreground">
                  From {invite.from_profile?.display_name || "Anonymous"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(invite.id, invite.challenge_id)}
                  disabled={processingId === invite.id}
                >
                  {processingId === invite.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invite.id)}
                  disabled={processingId === invite.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {invite.challenge && (
              <p className="text-xs text-muted-foreground">
                Goal: {invite.challenge.goal_value}{" "}
                {invite.challenge.goal_type.replace("_", " ")} by{" "}
                {format(new Date(invite.challenge.end_date), "MMM d, yyyy")}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
