-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create habits table (Do's and Don'ts)
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('do', 'dont')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- Create daily_records table (tracks habit completions)
CREATE TABLE public.daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, record_date, habit_id)
);

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own records"
  ON public.daily_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own records"
  ON public.daily_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON public.daily_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own records"
  ON public.daily_records FOR DELETE
  USING (auth.uid() = user_id);

-- Create journal_entries table
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, entry_date)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for journal entries
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();