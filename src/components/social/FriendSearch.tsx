import { useState, useRef, useCallback } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Friend } from "@/hooks/useFriends";

interface FriendSearchProps {
  onSearch: (query: string) => Promise<Friend[]>;
  onSendRequest: (userId: string) => Promise<void>;
  existingFriendIds: string[];
  pendingRequestIds: string[];
}

export const FriendSearch = ({
  onSearch,
  onSendRequest,
  existingFriendIds,
  pendingRequestIds,
}: FriendSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const lastSearchTime = useRef<number>(0);
  const SEARCH_COOLDOWN_MS = 500;

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    
    // Rate limit: enforce cooldown between searches
    const now = Date.now();
    if (now - lastSearchTime.current < SEARCH_COOLDOWN_MS) {
      return;
    }
    lastSearchTime.current = now;
    
    setSearching(true);
    const found = await onSearch(query.trim());
    setResults(found);
    setSearching(false);
  }, [query, onSearch]);

  const handleSendRequest = async (userId: string) => {
    setSendingTo(userId);
    await onSendRequest(userId);
    setSendingTo(null);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by display name or @username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={searching || query.trim().length < 2}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => {
            const isFriend = existingFriendIds.includes(user.id);
            const isPending = pendingRequestIds.includes(user.id);

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-medium">{user.display_name || "Anonymous"}</span>
                    {user.username && (
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    )}
                  </div>
                </div>
                
                {isFriend ? (
                  <span className="text-sm text-muted-foreground">Already friends</span>
                ) : isPending ? (
                  <span className="text-sm text-muted-foreground">Request pending</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(user.id)}
                    disabled={sendingTo === user.id}
                  >
                    {sendingTo === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No users found matching "{query}"
        </p>
      )}
    </div>
  );
};
