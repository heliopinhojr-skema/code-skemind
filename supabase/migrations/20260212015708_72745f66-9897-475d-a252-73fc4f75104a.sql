
-- Add terms acceptance tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN terms_accepted_at timestamp with time zone DEFAULT NULL;
