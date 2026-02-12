
-- Create scratch_pad table for persistent quick notes
CREATE TABLE public.scratch_pad (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Each user gets one scratch pad
CREATE UNIQUE INDEX idx_scratch_pad_user ON public.scratch_pad(user_id);

-- Enable RLS
ALTER TABLE public.scratch_pad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scratch pad"
ON public.scratch_pad FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scratch pad"
ON public.scratch_pad FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scratch pad"
ON public.scratch_pad FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_scratch_pad_updated_at
BEFORE UPDATE ON public.scratch_pad
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
