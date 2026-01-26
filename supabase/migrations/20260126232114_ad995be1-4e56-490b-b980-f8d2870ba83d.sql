-- Create badges table to define all available badges
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Icon name from lucide-react
  category TEXT NOT NULL, -- 'streak', 'habits', 'journal', 'social', 'special'
  requirement_type TEXT NOT NULL, -- 'streak_days', 'habits_completed', 'journal_entries', 'total_points', 'friends_count'
  requirement_value INTEGER NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table to track earned badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are readable by all authenticated users
CREATE POLICY "Anyone can view badges"
ON public.badges
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can view their own earned badges
CREATE POLICY "Users can view their own earned badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

-- Users can earn badges (insert)
CREATE POLICY "Users can earn badges"
ON public.user_badges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, category, requirement_type, requirement_value, rarity) VALUES
-- Streak badges
('First Steps', 'Complete your first day with 80%+ score', 'Footprints', 'streak', 'streak_days', 1, 'common'),
('Week Warrior', 'Maintain a 7-day streak', 'Calendar', 'streak', 'streak_days', 7, 'common'),
('Fortnight Fighter', 'Maintain a 14-day streak', 'Shield', 'streak', 'streak_days', 14, 'rare'),
('Monthly Master', 'Maintain a 30-day streak', 'Crown', 'streak', 'streak_days', 30, 'epic'),
('Century Champion', 'Maintain a 100-day streak', 'Trophy', 'streak', 'streak_days', 100, 'legendary'),

-- Habit completion badges
('Habit Starter', 'Complete 10 habits total', 'Zap', 'habits', 'habits_completed', 10, 'common'),
('Habit Builder', 'Complete 50 habits total', 'Hammer', 'habits', 'habits_completed', 50, 'common'),
('Habit Hero', 'Complete 100 habits total', 'Star', 'habits', 'habits_completed', 100, 'rare'),
('Habit Legend', 'Complete 500 habits total', 'Sparkles', 'habits', 'habits_completed', 500, 'epic'),
('Habit Master', 'Complete 1000 habits total', 'Award', 'habits', 'habits_completed', 1000, 'legendary'),

-- Journal badges
('Dear Diary', 'Write your first journal entry', 'BookOpen', 'journal', 'journal_entries', 1, 'common'),
('Thoughtful Writer', 'Write 10 journal entries', 'Pen', 'journal', 'journal_entries', 10, 'common'),
('Reflection Expert', 'Write 30 journal entries', 'Brain', 'journal', 'journal_entries', 30, 'rare'),
('Journal Master', 'Write 100 journal entries', 'Scroll', 'journal', 'journal_entries', 100, 'epic'),

-- Points badges
('Point Collector', 'Earn 100 total points', 'Coins', 'special', 'total_points', 100, 'common'),
('Point Hoarder', 'Earn 500 total points', 'Gem', 'special', 'total_points', 500, 'rare'),
('Point Millionaire', 'Earn 1000 total points', 'Diamond', 'special', 'total_points', 1000, 'epic'),

-- Social badges
('Social Butterfly', 'Add your first friend', 'Users', 'social', 'friends_count', 1, 'common'),
('Community Builder', 'Have 5 friends', 'Heart', 'social', 'friends_count', 5, 'rare'),
('Social Star', 'Have 10 friends', 'Sparkle', 'social', 'friends_count', 10, 'epic');