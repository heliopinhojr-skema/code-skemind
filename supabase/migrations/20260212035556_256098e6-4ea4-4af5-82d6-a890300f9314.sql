
-- Add IQ range columns to arena_listings
ALTER TABLE public.arena_listings
  ADD COLUMN iq_min integer NOT NULL DEFAULT 80,
  ADD COLUMN iq_max integer NOT NULL DEFAULT 110;

-- Update the Arena Qi MEDIO to use IQ 90-110
UPDATE public.arena_listings
SET iq_min = 90, iq_max = 110
WHERE id = '12b8f15e-d842-4671-bcab-40dfdd2b29d8';
