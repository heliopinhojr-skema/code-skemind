
-- Table to track investor interest registrations
CREATE TABLE public.investor_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id)
);

-- Enable RLS
ALTER TABLE public.investor_interest ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view count
CREATE POLICY "Authenticated can view investor interest"
  ON public.investor_interest FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Players can register their own interest
CREATE POLICY "Players can register interest"
  ON public.investor_interest FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = player_id));

-- Players can remove their own interest
CREATE POLICY "Players can remove own interest"
  ON public.investor_interest FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = player_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.investor_interest;
