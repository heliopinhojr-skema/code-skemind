
-- set_user_role_and_tier: allows master_admin to change user role and tier
CREATE OR REPLACE FUNCTION public.set_user_role_and_tier(
  p_target_user_id UUID,
  p_new_role public.app_role,
  p_new_tier TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- Verify caller is master_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Only master admins can change roles';
  END IF;

  -- Update or insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Remove old roles (keep only the new one)
  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id AND role != p_new_role;

  -- Update tier in profile
  UPDATE public.profiles
  SET player_tier = p_new_tier, updated_at = now()
  WHERE user_id = p_target_user_id;
END;
$$;

-- race_results table (used by submit-race-result edge function)
CREATE TABLE IF NOT EXISTS public.race_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id UUID NOT NULL REFERENCES public.official_races(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  time_remaining NUMERIC,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(race_id, player_id)
);

ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view race results" ON public.race_results FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert results" ON public.race_results FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- game_history table (used by submit-race-result edge function)
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.profiles(id),
  race_id UUID REFERENCES public.official_races(id) ON DELETE SET NULL,
  game_mode TEXT NOT NULL DEFAULT 'solo',
  won BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  time_remaining NUMERIC,
  secret_code JSONB,
  guesses JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own history" ON public.game_history FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert history" ON public.game_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
