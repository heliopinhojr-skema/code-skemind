
-- Add rank and prize_won columns to game_history for player statements
ALTER TABLE public.game_history 
ADD COLUMN IF NOT EXISTS rank integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prize_won numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS arena_buy_in numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS arena_pool numeric DEFAULT NULL;
