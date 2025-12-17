-- Create enum types for statuses
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE public.challenge_goal_type AS ENUM ('points', 'streak_days', 'habits_completed');

-- Update profiles table with social features
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_searchable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (from_user_id != to_user_id),
  CONSTRAINT unique_friend_request UNIQUE (from_user_id, to_user_id)
);

-- Create challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 100),
  description text CHECK (char_length(description) <= 500),
  start_date date NOT NULL,
  end_date date NOT NULL,
  goal_type public.challenge_goal_type NOT NULL,
  goal_value integer NOT NULL CHECK (goal_value > 0),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Create challenge_participants table
CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_participant UNIQUE (challenge_id, user_id)
);

-- Create challenge_invites table
CREATE TABLE public.challenge_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_invite_users CHECK (from_user_id != to_user_id),
  CONSTRAINT unique_challenge_invite UNIQUE (challenge_id, to_user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_invites ENABLE ROW LEVEL SECURITY;

-- Helper function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'accepted'
    AND ((from_user_id = user1_id AND to_user_id = user2_id)
      OR (from_user_id = user2_id AND to_user_id = user1_id))
  )
$$;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view friend requests involving them"
ON public.friend_requests FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests sent to them"
ON public.friend_requests FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their own requests"
ON public.friend_requests FOR DELETE
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS Policies for challenges
CREATE POLICY "Users can view challenges they participate in or public ones"
ON public.challenges FOR SELECT
USING (
  is_public = true 
  OR creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.challenge_participants 
    WHERE challenge_id = challenges.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create challenges"
ON public.challenges FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their challenges"
ON public.challenges FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their challenges"
ON public.challenges FOR DELETE
USING (auth.uid() = creator_id);

-- RLS Policies for challenge_participants
CREATE POLICY "Users can view participants of their challenges"
ON public.challenge_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.challenges 
    WHERE id = challenge_participants.challenge_id 
    AND (creator_id = auth.uid() OR is_public = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.challenge_participants cp2
    WHERE cp2.challenge_id = challenge_participants.challenge_id 
    AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join challenges"
ON public.challenge_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.challenge_participants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave challenges"
ON public.challenge_participants FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for challenge_invites
CREATE POLICY "Users can view invites involving them"
ON public.challenge_invites FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send invites for challenges they participate in"
ON public.challenge_invites FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id
  AND public.are_friends(auth.uid(), to_user_id)
  AND EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = challenge_invites.challenge_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Invited users can update invite status"
ON public.challenge_invites FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their invites"
ON public.challenge_invites FOR DELETE
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Update profiles policy to allow searching
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view searchable profiles"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR is_searchable = true);

-- Triggers for updated_at
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();