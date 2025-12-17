import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Trophy, UserPlus, Bell } from "lucide-react";
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
import { useFriends } from "@/hooks/useFriends";
import { useChallenges } from "@/hooks/useChallenges";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Social = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
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
  } = useChallenges();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
      }
    });
  }, [navigate]);

  const totalNotifications = incomingRequests.length + invites.length;

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

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

            {/* Create Challenge */}
            <div className="flex justify-end">
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
              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    participants={participants.get(challenge.id) || []}
                    currentUserId={userId}
                    friends={friends}
                    onInvite={inviteFriend}
                    onLeave={leaveChallenge}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Social;
