-- =============================================
-- SKEMIND Backend - Complete Database Schema
-- =============================================

-- 1. Create app_role enum for user roles (security best practice)
CREATE TYPE public.app_role AS ENUM ('guardian', 'moderator', 'player');

-- 2. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 3. Create profiles table (players)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 15),
  emoji TEXT NOT NULL DEFAULT '🎮',
  invite_code TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id),
  invited_by_name TEXT,
  energy DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  last_refill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stats_wins INTEGER NOT NULL DEFAULT 0,
  stats_races INTEGER NOT NULL DEFAULT 0,
  stats_best_time INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create referrals table (invite system)
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invited_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reward_credited BOOLEAN NOT NULL DEFAULT FALSE,
  reward_amount DECIMAL(10,2) DEFAULT 10.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(inviter_id, invited_id)
);

-- 5. Create official_races table
CREATE TABLE public.official_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  entry_fee DECIMAL(10,2) NOT NULL DEFAULT 1.10,
  prize_per_player DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  skema_box_fee DECIMAL(10,2) NOT NULL DEFAULT 0.10,
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 16,
  status TEXT NOT NULL DEFAULT 'registration' 
    CHECK (status IN ('registration', 'starting', 'running', 'finished', 'cancelled')),
  creator_id UUID REFERENCES public.profiles(id),
  secret_code TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create race_registrations table
CREATE TABLE public.race_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES public.official_races(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  fee_paid DECIMAL(10,2) NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(race_id, player_id)
);

-- 7. Create race_results table
CREATE TABLE public.race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES public.official_races(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rank INTEGER,
  status TEXT NOT NULL CHECK (status IN ('won', 'lost', 'playing', 'waiting')),
  attempts INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  time_remaining INTEGER,
  prize_amount DECIMAL(10,2) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(race_id, player_id)
);

-- 8. Create game_history table
CREATE TABLE public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_mode TEXT NOT NULL CHECK (game_mode IN ('training', 'bots', 'official', 'party')),
  race_id UUID REFERENCES public.official_races(id),
  won BOOLEAN NOT NULL,
  attempts INTEGER NOT NULL,
  score INTEGER NOT NULL,
  time_remaining INTEGER,
  secret_code TEXT[] NOT NULL,
  guesses JSONB,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Create skema_box table (singleton)
CREATE TABLE public.skema_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert singleton row
INSERT INTO public.skema_box (id, balance) VALUES ('00000000-0000-0000-0000-000000000001', 0);

-- 10. Create skema_box_transactions table
CREATE TABLE public.skema_box_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('arena_rake', 'official_rake', 'official_refund', 'party_rake', 'reset', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Enable Row Level Security on all tables
-- =============================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skema_box ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skema_box_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Security Definer Functions (for RLS bypass)
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- =============================================
-- RLS Policies
-- =============================================

-- User Roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Referrals policies
CREATE POLICY "Users can view own referrals as inviter"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (inviter_id = public.get_my_profile_id());

CREATE POLICY "Users can view referrals where they were invited"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (invited_id = public.get_my_profile_id());

-- Official races policies
CREATE POLICY "Races are viewable by authenticated users"
  ON public.official_races FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Guardians can create races"
  ON public.official_races FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'guardian'));

CREATE POLICY "Guardians can update races"
  ON public.official_races FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'guardian'));

-- Race registrations policies
CREATE POLICY "Users can view own registrations"
  ON public.race_registrations FOR SELECT
  TO authenticated
  USING (player_id = public.get_my_profile_id());

CREATE POLICY "Guardians can view all registrations"
  ON public.race_registrations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'guardian'));

-- Race results policies
CREATE POLICY "Race results are viewable by authenticated users"
  ON public.race_results FOR SELECT
  TO authenticated
  USING (true);

-- Game history policies
CREATE POLICY "Users can view own game history"
  ON public.game_history FOR SELECT
  TO authenticated
  USING (player_id = public.get_my_profile_id());

CREATE POLICY "Users can insert own game history"
  ON public.game_history FOR INSERT
  TO authenticated
  WITH CHECK (player_id = public.get_my_profile_id());

-- Skema box policies (no direct access - only via functions)
CREATE POLICY "Guardians can view skema_box"
  ON public.skema_box FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'guardian'));

-- Skema box transactions policies
CREATE POLICY "Guardians can view transactions"
  ON public.skema_box_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'guardian'));

-- =============================================
-- Database Functions
-- =============================================

-- Function to update player energy
CREATE OR REPLACE FUNCTION public.update_player_energy(
  p_player_id UUID,
  p_amount DECIMAL
) RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  UPDATE public.profiles
  SET energy = GREATEST(0, energy + p_amount),
      updated_at = NOW()
  WHERE id = p_player_id
  RETURNING energy INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$;

-- Function to register a new player
CREATE OR REPLACE FUNCTION public.register_player(
  p_name TEXT,
  p_emoji TEXT,
  p_invite_code TEXT
) RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter public.profiles;
  v_new_code TEXT;
  v_profile public.profiles;
  v_master_codes TEXT[] := ARRAY['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
BEGIN
  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a profile';
  END IF;

  -- Validate invite code
  SELECT * INTO v_inviter FROM public.profiles WHERE invite_code = UPPER(p_invite_code);
  
  IF v_inviter IS NULL AND NOT (UPPER(p_invite_code) = ANY(v_master_codes)) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  -- Generate unique invite code
  LOOP
    v_new_code := 'SK' || UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = v_new_code);
  END LOOP;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, name, emoji, invite_code, invited_by, invited_by_name)
  VALUES (auth.uid(), p_name, p_emoji, v_new_code, v_inviter.id, v_inviter.name)
  RETURNING * INTO v_profile;
  
  -- Register referral if there's an inviter
  IF v_inviter IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id)
    VALUES (v_inviter.id, v_profile.id);
  END IF;
  
  -- Assign default player role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'player');
  
  RETURN v_profile;
END;
$$;

-- Function to register for a race
CREATE OR REPLACE FUNCTION public.register_for_race(
  p_race_id UUID
) RETURNS public.race_registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player public.profiles;
  v_race public.official_races;
  v_registration public.race_registrations;
  v_current_count INTEGER;
BEGIN
  -- Get player profile
  SELECT * INTO v_player FROM public.profiles WHERE user_id = auth.uid();
  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
  
  -- Get race
  SELECT * INTO v_race FROM public.official_races WHERE id = p_race_id;
  IF v_race IS NULL OR v_race.status != 'registration' THEN
    RAISE EXCEPTION 'Race not available for registration';
  END IF;
  
  -- Check if already registered
  IF EXISTS (SELECT 1 FROM public.race_registrations WHERE race_id = p_race_id AND player_id = v_player.id) THEN
    RAISE EXCEPTION 'Already registered for this race';
  END IF;
  
  -- Check max players
  SELECT COUNT(*) INTO v_current_count FROM public.race_registrations WHERE race_id = p_race_id;
  IF v_current_count >= v_race.max_players THEN
    RAISE EXCEPTION 'Race is full';
  END IF;
  
  -- Check energy
  IF v_player.energy < v_race.entry_fee THEN
    RAISE EXCEPTION 'Insufficient energy';
  END IF;
  
  -- Debit energy
  PERFORM update_player_energy(v_player.id, -v_race.entry_fee);
  
  -- Credit fee to Skema Box
  UPDATE public.skema_box 
  SET balance = balance + v_race.skema_box_fee,
      updated_at = NOW()
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  INSERT INTO public.skema_box_transactions (type, amount, balance_after, description)
  SELECT 'official_rake', v_race.skema_box_fee, balance, 'Race registration: ' || v_race.name
  FROM public.skema_box WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Register for race
  INSERT INTO public.race_registrations (race_id, player_id, fee_paid)
  VALUES (p_race_id, v_player.id, v_race.entry_fee)
  RETURNING * INTO v_registration;
  
  RETURN v_registration;
END;
$$;

-- Function to process referral reward
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_referral_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals;
  v_inviter_referral_count INTEGER;
BEGIN
  -- Get referral
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;
  IF v_referral IS NULL OR v_referral.reward_credited THEN
    RETURN FALSE;
  END IF;
  
  -- Count existing credited referrals for inviter (max 10)
  SELECT COUNT(*) INTO v_inviter_referral_count 
  FROM public.referrals 
  WHERE inviter_id = v_referral.inviter_id AND reward_credited = TRUE;
  
  IF v_inviter_referral_count >= 10 THEN
    RETURN FALSE;
  END IF;
  
  -- Credit reward to inviter
  PERFORM update_player_energy(v_referral.inviter_id, v_referral.reward_amount);
  
  -- Mark as credited
  UPDATE public.referrals 
  SET reward_credited = TRUE 
  WHERE id = p_referral_id;
  
  RETURN TRUE;
END;
$$;

-- =============================================
-- Triggers
-- =============================================

-- Daily energy refill trigger function
CREATE OR REPLACE FUNCTION public.daily_energy_refill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_refill_date < CURRENT_DATE AND NEW.energy < 10 THEN
    NEW.energy := 10;
    NEW.last_refill_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for daily refill
CREATE TRIGGER trigger_daily_refill
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.daily_energy_refill();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skema_box_updated_at
  BEFORE UPDATE ON public.skema_box
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Indexes for performance
-- =============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_invite_code ON public.profiles(invite_code);
CREATE INDEX idx_referrals_inviter_id ON public.referrals(inviter_id);
CREATE INDEX idx_referrals_invited_id ON public.referrals(invited_id);
CREATE INDEX idx_official_races_status ON public.official_races(status);
CREATE INDEX idx_official_races_scheduled_date ON public.official_races(scheduled_date);
CREATE INDEX idx_race_registrations_race_id ON public.race_registrations(race_id);
CREATE INDEX idx_race_registrations_player_id ON public.race_registrations(player_id);
CREATE INDEX idx_race_results_race_id ON public.race_results(race_id);
CREATE INDEX idx_race_results_player_id ON public.race_results(player_id);
CREATE INDEX idx_game_history_player_id ON public.game_history(player_id);
CREATE INDEX idx_game_history_played_at ON public.game_history(played_at DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);