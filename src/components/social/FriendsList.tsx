import { useState } from "react";
import { UserMinus, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Friend } from "@/hooks/useFriends";

interface FriendsListProps {
  friends: Friend[];
  onRemove: (friendId: string) => Promise<void>;
  onStartChat?: (friendId: string) => void;
}

export const FriendsList = ({ friends, onRemove, onStartChat }: FriendsListProps) => {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleRemove = async (friendId: string) => {
    setRemovingId(friendId);
    await onRemove(friendId);
    setRemovingId(null);
  };

  if (friends.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No friends yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Search for users to send friend requests
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback>{getInitials(friend.display_name)}</AvatarFallback>
            </Avatar>
            <div>
              <span className="font-medium">{friend.display_name || "Anonymous"}</span>
              {friend.username && (
                <p className="text-sm text-muted-foreground">@{friend.username}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onStartChat && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStartChat(friend.id)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={removingId === friend.id}
                >
                  {removingId === friend.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove friend?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {friend.display_name || "this user"} from
                    your friends? You'll need to send a new friend request to reconnect.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleRemove(friend.id)}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
};
