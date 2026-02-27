-- Revert percentage default to 2.5%
ALTER TABLE public.investment_blocks ALTER COLUMN percentage SET DEFAULT 2.5;

-- Table for player block reservations
CREATE TABLE public.block_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  blocks_wanted INTEGER NOT NULL DEFAULT 1 CHECK (blocks_wanted >= 1 AND blocks_wanted <= 10),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.block_reservations ENABLE ROW LEVEL SECURITY;

-- Players can view their own reservations
CREATE POLICY "Players view own reservations"
ON public.block_reservations FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = block_reservations.player_id)
  OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'guardiao'::app_role)
);

-- Players can insert their own reservations
CREATE POLICY "Players can create reservations"
ON public.block_reservations FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = block_reservations.player_id)
);

-- Players can cancel their own pending reservations
CREATE POLICY "Players can update own reservations"
ON public.block_reservations FOR UPDATE
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = block_reservations.player_id)
  OR has_role(auth.uid(), 'master_admin'::app_role)
);

-- Admins can delete reservations
CREATE POLICY "Admins can delete reservations"
ON public.block_reservations FOR DELETE
USING (
  has_role(auth.uid(), 'master_admin'::app_role)
);