import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Trophy, UserPlus, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FriendSearch } from "@/components/social/FriendSearch";
import { FriendRequests } from "@/components/social/FriendRequests";
import { FriendsList } from "@/components/social/FriendsList";
import { CreateChallengeDialog } from "@/components/challenges/CreateChallengeDialog";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { ChallengeInvites } from "@/components/challenges/ChallengeInvites";
import { ChallengeLeaderboard } from "@/components/challenges/ChallengeLeaderboard";
import { useFriends } from "@/hooks/useFriends";
import { useChallenges } from "@/hooks/useChallenges";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Social = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading: friendsLoading,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    searchUsers,
    refresh: refreshFriends,
  } = useFriends();

  const {
    challenges,
    participants,
    invites,
    loading: challengesLoading,
    createChallenge,
    inviteFriend,
    acceptInvite,
    rejectInvite,
    leaveChallenge,
    refresh: refreshChallenges,
  } = useChallenges();

  const { syncAllProgress } = useChallengeProgress();

  // Real-time notifications
  useRealtimeNotifications({
    userId,
    onFriendRequest: refreshFriends,
    onChallengeInvite: refreshChallenges,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
      }
    });
  }, [navigate]);

  // Auto-sync progress when challenges load
  useEffect(() => {
    if (userId && challenges.length > 0 && !challengesLoading) {
      syncAllProgress(challenges, userId).then(() => refreshChallenges());
    }
  }, [userId, challenges.length, challengesLoading]);

  const handleSyncProgress = useCallback(async () => {
    if (!userId || challenges.length === 0) return;
    setSyncing(true);
    await syncAllProgress(challenges, userId);
    await refreshChallenges();
    setSyncing(false);
  }, [userId, challenges, syncAllProgress, refreshChallenges]);

  const totalNotifications = incomingRequests.length + invites.length;

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const selectedChallengeData = selectedChallenge 
    ? challenges.find(c => c.id === selectedChallenge)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Social
            </h1>
            {totalNotifications > 0 && (
              <Badge variant="destructive" className="rounded-full">
                {totalNotifications}
              </Badge>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Friends
              {incomingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {incomingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Challenges
              {invites.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {invites.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Search */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Find Friends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FriendSearch
                    onSearch={searchUsers}
                    onSendRequest={sendFriendRequest}
                    existingFriendIds={friends.map(f => f.id)}
                    pendingRequestIds={outgoingRequests.map(r => r.to_user_id)}
                  />
                </CardContent>
              </Card>

              {/* Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Friend Requests
                    {incomingRequests.length > 0 && (
                      <Badge>{incomingRequests.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FriendRequests
                    incoming={incomingRequests}
                    outgoing={outgoingRequests}
                    onAccept={acceptRequest}
                    onReject={rejectRequest}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Friends List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  My Friends ({friends.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {friendsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <FriendsList friends={friends} onRemove={removeFriend} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            {/* Challenge Invites */}
            <ChallengeInvites
              invites={invites}
              onAccept={acceptInvite}
              onReject={rejectInvite}
            />

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncProgress}
                disabled={syncing || challenges.length === 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                Sync Progress
              </Button>
              <CreateChallengeDialog onCreate={createChallenge} />
            </div>

            {/* Challenges List */}
            {challengesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : challenges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No challenges yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a challenge and invite your friends to compete!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Your Challenges</h3>
                  {challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className={`cursor-pointer transition-all ${
                        selectedChallenge === challenge.id ? "ring-2 ring-primary rounded-lg" : ""
                      }`}
                      onClick={() => setSelectedChallenge(challenge.id)}
                    >
                      <ChallengeCard
                        challenge={challenge}
                        participants={participants.get(challenge.id) || []}
                        currentUserId={userId}
                        friends={friends}
                        onInvite={inviteFriend}
                        onLeave={leaveChallenge}
                      />
                    </div>
                  ))}
                </div>

                {/* Leaderboard Panel */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Leaderboard</h3>
                  {selectedChallengeData ? (
                    <ChallengeLeaderboard
                      challenge={selectedChallengeData}
                      participants={participants.get(selectedChallengeData.id) || []}
                      currentUserId={userId}
                    />
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        Select a challenge to view its leaderboard
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Social;
