
-- Table for custom arena listings created by Grão Mestre+
CREATE TABLE public.arena_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  buy_in NUMERIC NOT NULL DEFAULT 0.55,
  rake_fee NUMERIC NOT NULL DEFAULT 0.05,
  bot_count INTEGER NOT NULL DEFAULT 99,
  status TEXT NOT NULL DEFAULT 'open',
  max_entries INTEGER NOT NULL DEFAULT 0,
  total_entries INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arena_listings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view open arenas
CREATE POLICY "Anyone can view arena listings"
ON public.arena_listings
FOR SELECT
USING (true);

-- Grão Mestre, Guardião, and Master Admin can create arenas
CREATE POLICY "Higher tiers can create arenas"
ON public.arena_listings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'master_admin') OR
  has_role(auth.uid(), 'guardiao') OR
  has_role(auth.uid(), 'grao_mestre')
);

-- Master admin can manage all arenas (update/delete)
CREATE POLICY "Admins can manage arenas"
ON public.arena_listings
FOR UPDATE
USING (
  has_role(auth.uid(), 'master_admin') OR
  has_role(auth.uid(), 'guardiao') OR
  has_role(auth.uid(), 'grao_mestre')
);

-- Table for tracking arena entries (who played which arena)
CREATE TABLE public.arena_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES public.arena_listings(id),
  player_id UUID NOT NULL REFERENCES public.profiles(id),
  rank INTEGER,
  prize_won NUMERIC NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  time_remaining NUMERIC,
  status TEXT NOT NULL DEFAULT 'playing',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.arena_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can view entries
CREATE POLICY "Anyone can view arena entries"
ON public.arena_entries
FOR SELECT
USING (true);

-- Authenticated can create entries
CREATE POLICY "Authenticated can enter arenas"
ON public.arena_entries
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Players can update own entries (to save results)
CREATE POLICY "Players can update own entries"
ON public.arena_entries
FOR UPDATE
USING (auth.uid() IS NOT NULL);
