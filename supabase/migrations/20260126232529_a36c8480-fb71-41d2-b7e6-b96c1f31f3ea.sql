-- Create user_levels table to track XP and level
CREATE TABLE public.user_levels (
  user_id UUID PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- Users can view their own level
CREATE POLICY "Users can view their own level"
ON public.user_levels
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own level record
CREATE POLICY "Users can insert their own level"
ON public.user_levels
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own level
CREATE POLICY "Users can update their own level"
ON public.user_levels
FOR UPDATE
USING (auth.uid() = user_id);

-- Create levels definition table
CREATE TABLE public.level_definitions (
  level INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  min_xp INTEGER NOT NULL,
  icon TEXT NOT NULL
);

-- Insert level definitions
INSERT INTO public.level_definitions (level, title, min_xp, icon) VALUES
(1, 'Recruit', 0, 'User'),
(2, 'Soldier', 100, 'Sword'),
(3, 'Warrior', 300, 'Shield'),
(4, 'Captain', 600, 'Anchor'),
(5, 'Commander', 1000, 'Medal'),
(6, 'Elite', 1800, 'Star'),
(7, 'Commando', 3000, 'Target'),
(8, 'Champion', 5000, 'Crown'),
(9, 'Dragon', 8000, 'Flame'),
(10, 'Legend', 12000, 'Trophy');

-- Anyone authenticated can view level definitions
ALTER TABLE public.level_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view level definitions"
ON public.level_definitions
FOR SELECT
USING (auth.uid() IS NOT NULL);