
-- Habit Workspace items (files + links)
CREATE TABLE public.habit_workspace_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('file', 'link')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  url TEXT,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workspace_items_habit ON public.habit_workspace_items(habit_id);
CREATE INDEX idx_workspace_items_user ON public.habit_workspace_items(user_id);

ALTER TABLE public.habit_workspace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own workspace items" ON public.habit_workspace_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own workspace items" ON public.habit_workspace_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workspace items" ON public.habit_workspace_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own workspace items" ON public.habit_workspace_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_workspace_items_updated_at
  BEFORE UPDATE ON public.habit_workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Diary entries (rich text via TipTap JSON)
CREATE TABLE public.diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT CHECK (title IS NULL OR char_length(title) <= 200),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (octet_length(content::text) <= 200000)
);
CREATE INDEX idx_diary_entries_user_date ON public.diary_entries(user_id, entry_date DESC);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own diary" ON public.diary_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own diary" ON public.diary_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own diary" ON public.diary_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own diary" ON public.diary_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Diary <-> Habit tags
CREATE TABLE public.diary_entry_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diary_entry_id UUID NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (diary_entry_id, habit_id)
);
CREATE INDEX idx_diary_habits_habit ON public.diary_entry_habits(habit_id);
CREATE INDEX idx_diary_habits_user ON public.diary_entry_habits(user_id);

ALTER TABLE public.diary_entry_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own diary tags" ON public.diary_entry_habits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own diary tags" ON public.diary_entry_habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own diary tags" ON public.diary_entry_habits
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for habit files (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('habit-files', 'habit-files', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own habit files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'habit-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own habit files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'habit-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own habit files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'habit-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own habit files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'habit-files' AND auth.uid()::text = (storage.foldername(name))[1]);
