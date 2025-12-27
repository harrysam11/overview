import { MessageCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChatConversation } from "@/hooks/useChat";
import { Group } from "@/hooks/useGroups";
import { formatDistanceToNow } from "date-fns";

interface ChatListProps {
  conversations: ChatConversation[];
  groups: Group[];
  onSelectChat: (friendId: string) => void;
  onSelectGroup: (groupId: string) => void;
  selectedChatId: string | null;
  selectedGroupId: string | null;
}

export const ChatList = ({
  conversations,
  groups,
  onSelectChat,
  onSelectGroup,
  selectedChatId,
  selectedGroupId,
}: ChatListProps) => {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Direct Messages */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
          <MessageCircle className="h-4 w-4" />
          Direct Messages
        </h3>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.friendId}
                onClick={() => onSelectChat(conv.friendId)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                  selectedChatId === conv.friendId ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conv.friendAvatar || undefined} />
                  <AvatarFallback>{getInitials(conv.friendName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {conv.friendName || "Anonymous"}
                    </span>
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="ml-2">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                  {conv.lastMessageTime && (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Groups */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
          <Users className="h-4 w-4" />
          Groups
        </h3>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No groups yet
          </p>
        ) : (
          <div className="space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                  selectedGroupId === group.id ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={group.avatar_url || undefined} />
                  <AvatarFallback>
                    <Users className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-medium truncate block">{group.name}</span>
                  <p className="text-sm text-muted-foreground">
                    {group.member_count} members
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
