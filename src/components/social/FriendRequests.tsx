import { Check, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FriendRequest } from "@/hooks/useFriends";

interface FriendRequestsProps {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

export const FriendRequests = ({
  incoming,
  outgoing,
  onAccept,
  onReject,
}: FriendRequestsProps) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    await onAccept(id);
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    await onReject(id);
    setProcessingId(null);
  };

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No pending friend requests
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {incoming.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Incoming Requests</h4>
          {incoming.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.from_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(request.from_profile?.display_name || null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {request.from_profile?.display_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">wants to be friends</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAccept(request.id)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Sent Requests</h4>
          {outgoing.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.to_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(request.to_profile?.display_name || null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {request.to_profile?.display_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
