
-- ==================== ENUM ====================
CREATE TYPE public.app_role AS ENUM ('master_admin', 'guardiao', 'grao_mestre', 'mestre', 'jogador');

-- ==================== PROFILES ====================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎮',
  pin TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  invited_by TEXT,
  invited_by_name TEXT,
  player_tier TEXT DEFAULT 'jogador',
  energy NUMERIC NOT NULL DEFAULT 10,
  last_refill_date TEXT DEFAULT to_char(now(), 'YYYY-MM-DD'),
  stats_wins INTEGER NOT NULL DEFAULT 0,
  stats_races INTEGER NOT NULL DEFAULT 0,
  stats_best_time NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive unique index on name
CREATE UNIQUE INDEX idx_profiles_name_lower ON public.profiles (lower(name));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==================== USER ROLES ====================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
);

-- ==================== REFERRALS ====================
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id),
  invited_id UUID NOT NULL REFERENCES public.profiles(id),
  reward_amount NUMERIC DEFAULT 10,
  reward_credited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invited_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all referrals" ON public.referrals FOR SELECT USING (true);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Service updates referrals" ON public.referrals FOR UPDATE USING (true);

-- ==================== SKEMA BOX ====================
CREATE TABLE public.skema_box (
  id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' PRIMARY KEY,
  balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skema_box ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skema box" ON public.skema_box FOR SELECT USING (true);
CREATE POLICY "Admins can update skema box" ON public.skema_box FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
);

-- Insert initial skema box row
INSERT INTO public.skema_box (id, balance) VALUES ('00000000-0000-0000-0000-000000000001', 0);

-- ==================== SKEMA BOX TRANSACTIONS ====================
CREATE TABLE public.skema_box_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skema_box_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view transactions" ON public.skema_box_transactions FOR SELECT USING (true);
CREATE POLICY "Insert via service" ON public.skema_box_transactions FOR INSERT WITH CHECK (true);

-- ==================== OFFICIAL RACES ====================
CREATE TABLE public.official_races (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registration',
  scheduled_date TIMESTAMPTZ NOT NULL,
  entry_fee NUMERIC NOT NULL DEFAULT 1.10,
  prize_per_player NUMERIC NOT NULL DEFAULT 1.00,
  skema_box_fee NUMERIC NOT NULL DEFAULT 0.10,
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 16,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.official_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view races" ON public.official_races FOR SELECT USING (true);
CREATE POLICY "Admins can manage races" ON public.official_races FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
);

-- ==================== RACE REGISTRATIONS ====================
CREATE TABLE public.race_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id UUID NOT NULL REFERENCES public.official_races(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(race_id, player_id)
);

ALTER TABLE public.race_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view registrations" ON public.race_registrations FOR SELECT USING (true);
CREATE POLICY "Users can register for races" ON public.race_registrations FOR INSERT WITH CHECK (true);

-- ==================== FUNCTIONS ====================

-- has_role: check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- update_player_energy: atomic energy update
CREATE OR REPLACE FUNCTION public.update_player_energy(p_player_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET energy = GREATEST(0, energy + p_amount),
      updated_at = now()
  WHERE id = p_player_id;
END;
$$;

-- register_player: create profile on registration
CREATE OR REPLACE FUNCTION public.register_player(p_name TEXT, p_emoji TEXT, p_invite_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_invite_code TEXT;
  v_inviter_id UUID;
  v_inviter_name TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate unique invite code (SK + 6 random chars)
  v_new_invite_code := 'SK' || upper(substr(md5(random()::text), 1, 6));
  
  -- Look up inviter by invite code
  SELECT id, name INTO v_inviter_id, v_inviter_name
  FROM public.profiles
  WHERE invite_code = p_invite_code;

  -- Create profile
  INSERT INTO public.profiles (user_id, name, emoji, invite_code, invited_by, invited_by_name)
  VALUES (v_user_id, p_name, p_emoji, v_new_invite_code, p_invite_code, v_inviter_name);

  -- Create referral record if inviter exists
  IF v_inviter_id IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id)
    VALUES (v_inviter_id, (SELECT id FROM public.profiles WHERE user_id = v_user_id));
  END IF;
END;
$$;

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
