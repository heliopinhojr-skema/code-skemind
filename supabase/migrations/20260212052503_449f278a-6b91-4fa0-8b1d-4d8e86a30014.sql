
-- Add difficulty level to arena_listings
ALTER TABLE public.arena_listings
ADD COLUMN difficulty text NOT NULL DEFAULT 'MEDIO';
