-- Add length constraints to tables
ALTER TABLE public.habits
ADD CONSTRAINT habits_name_length CHECK (char_length(name) <= 100);

ALTER TABLE public.journal_entries
ADD CONSTRAINT journal_content_length CHECK (char_length(content) <= 5000);

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) <= 100);

-- Update handle_new_user function to validate and limit input length
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    substring(
      COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
      1,
      100
    )
  );
  RETURN new;
END;
$$;