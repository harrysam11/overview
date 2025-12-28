-- Create app_shortcuts table for storing user shortcuts
CREATE TABLE public.app_shortcuts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    favicon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT valid_url CHECK (url ~ '^https?://.*')
);

-- Enable RLS
ALTER TABLE public.app_shortcuts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own shortcuts" 
ON public.app_shortcuts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shortcuts" 
ON public.app_shortcuts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shortcuts" 
ON public.app_shortcuts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shortcuts" 
ON public.app_shortcuts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_app_shortcuts_user_id ON public.app_shortcuts(user_id);
CREATE INDEX idx_app_shortcuts_sort_order ON public.app_shortcuts(user_id, sort_order);