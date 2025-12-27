import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Friend } from "@/hooks/useFriends";
import { GroupMember } from "@/hooks/useGroups";

interface AddGroupMemberDialogProps {
  friends: Friend[];
  currentMembers: GroupMember[];
  onAddMember: (userId: string) => Promise<void>;
}

export const AddGroupMemberDialog = ({
  friends,
  currentMembers,
  onAddMember,
}: AddGroupMemberDialogProps) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const memberIds = currentMembers.map(m => m.user_id);
  const availableFriends = friends.filter(f => !memberIds.includes(f.id));

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    await onAddMember(userId);
    setAdding(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
          <DialogDescription>
            Add friends to this group.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {availableFriends.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              All your friends are already in this group
            </p>
          ) : (
            <div className="space-y-2">
              {availableFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(friend.display_name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.display_name || "Anonymous"}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAdd(friend.id)}
                    disabled={adding === friend.id}
                  >
                    {adding === friend.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
