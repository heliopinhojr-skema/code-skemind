-- Add generation_color column to profiles (only Criadores will set this)
ALTER TABLE public.profiles ADD COLUMN generation_color TEXT DEFAULT NULL;

-- Create index for quick lookup of taken colors
CREATE INDEX idx_profiles_generation_color ON public.profiles (generation_color) WHERE generation_color IS NOT NULL;