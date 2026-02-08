
-- =============================================
-- 1. CREATE invite_codes TABLE
-- =============================================
CREATE TABLE public.invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes (code);
CREATE INDEX idx_invite_codes_creator ON public.invite_codes (creator_id);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can read (codes need to be validated during registration)
CREATE POLICY "Anyone can view invite codes"
ON public.invite_codes FOR SELECT
USING (true);

-- Authenticated users can insert (via RPC mainly, but allow direct for flexibility)
CREATE POLICY "Authenticated users can create invite codes"
ON public.invite_codes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only the system (SECURITY DEFINER RPCs) updates used_by_id
CREATE POLICY "System updates invite codes"
ON public.invite_codes FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'::app_role));

-- =============================================
-- 2. RPC: generate_invite_code
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_invite_code(p_creator_profile_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Verify caller owns this profile
  v_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_creator_profile_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: profile does not belong to caller';
  END IF;

  -- Generate unique SKINV + 6 chars code
  LOOP
    v_code := 'SKINV' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.invite_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO public.invite_codes (code, creator_id)
  VALUES (v_code, p_creator_profile_id);

  RETURN v_code;
END;
$$;

-- =============================================
-- 3. UPDATE validate_invite_code to check invite_codes
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite RECORD;
  v_inviter RECORD;
  v_is_guardian BOOLEAN;
BEGIN
  -- 1. Check master codes (always valid, unlimited use)
  IF p_code IN ('SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI') THEN
    RETURN json_build_object(
      'valid', true,
      'inviter_id', NULL,
      'inviter_name', 'SKEMA',
      'inviter_tier', 'master_admin',
      'inviter_is_guardian', true
    );
  END IF;

  -- 2. Check invite_codes table (SKINV codes - unique one-time-use)
  SELECT ic.id, ic.code, ic.creator_id, ic.used_by_id
  INTO v_invite
  FROM public.invite_codes ic
  WHERE ic.code = p_code;

  IF v_invite IS NOT NULL THEN
    -- Code found - check if already used
    IF v_invite.used_by_id IS NOT NULL THEN
      RETURN json_build_object('valid', false, 'reason', 'code_already_used');
    END IF;

    -- Get inviter details
    SELECT p.id, p.name, p.player_tier, p.user_id
    INTO v_inviter
    FROM public.profiles p
    WHERE p.id = v_invite.creator_id;

    IF v_inviter IS NULL THEN
      RETURN json_build_object('valid', false);
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.user_roles WHERE user_id = v_inviter.user_id AND role IN ('master_admin', 'guardiao')
    ) INTO v_is_guardian;

    RETURN json_build_object(
      'valid', true,
      'inviter_id', v_inviter.id,
      'inviter_name', v_inviter.name,
      'inviter_tier', COALESCE(v_inviter.player_tier, 'jogador'),
      'inviter_is_guardian', v_is_guardian,
      'invite_code_id', v_invite.id
    );
  END IF;

  -- 3. Legacy: check profile invite codes (SK + 6 chars)
  -- Still accepted for backward compatibility
  SELECT p.id, p.name, p.player_tier, p.user_id
  INTO v_inviter
  FROM public.profiles p
  WHERE p.invite_code = p_code;

  IF v_inviter IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles WHERE user_id = v_inviter.user_id AND role IN ('master_admin', 'guardiao')
    ) INTO v_is_guardian;

    RETURN json_build_object(
      'valid', true,
      'inviter_id', v_inviter.id,
      'inviter_name', v_inviter.name,
      'inviter_tier', COALESCE(v_inviter.player_tier, 'jogador'),
      'inviter_is_guardian', v_is_guardian
    );
  END IF;

  -- 4. Invalid code
  RETURN json_build_object('valid', false);
END;
$$;

-- =============================================
-- 4. UPDATE register_player to mark invite codes as used
-- =============================================
CREATE OR REPLACE FUNCTION public.register_player(p_name text, p_emoji text, p_invite_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_new_invite_code TEXT;
  v_inviter RECORD;
  v_inviter_tier TEXT;
  v_transfer_amount NUMERIC := 0;
  v_new_tier TEXT := 'jogador';
  v_new_role app_role := 'jogador';
  v_new_profile_id UUID;
  v_is_master_code BOOLEAN := false;
  v_invite_code_record RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate unique invite code for the new player (SK + 6 random chars)
  LOOP
    v_new_invite_code := 'SK' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = v_new_invite_code);
  END LOOP;

  -- Check if invite code is from invite_codes table (SKINV codes)
  SELECT ic.id, ic.creator_id, ic.used_by_id
  INTO v_invite_code_record
  FROM public.invite_codes ic
  WHERE ic.code = p_invite_code;

  -- If found in invite_codes, verify it's not already used
  IF v_invite_code_record IS NOT NULL AND v_invite_code_record.used_by_id IS NOT NULL THEN
    RAISE EXCEPTION 'Código de convite já foi utilizado';
  END IF;

  -- Check if it's a master invite code
  IF p_invite_code IN ('SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI') THEN
    v_is_master_code := true;
    v_new_tier := 'Criador';
    v_new_role := 'guardiao';
    v_transfer_amount := 200000;
    
    -- Find the HX (master_admin) account to debit
    SELECT p.id, p.name, p.energy, p.player_tier, p.user_id
    INTO v_inviter
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'master_admin'
    LIMIT 1;
    
    IF v_inviter.id IS NOT NULL THEN
      IF v_inviter.energy < v_transfer_amount THEN
        RAISE EXCEPTION 'Conta raiz sem saldo suficiente para convidar (necessário: % k$)', v_transfer_amount;
      END IF;
      
      UPDATE public.profiles
      SET energy = energy - v_transfer_amount, updated_at = now()
      WHERE id = v_inviter.id;
    END IF;
  ELSE
    -- Try to find inviter from invite_codes table first
    IF v_invite_code_record IS NOT NULL THEN
      SELECT p.id, p.name, p.energy, p.player_tier, p.user_id
      INTO v_inviter
      FROM public.profiles p
      WHERE p.id = v_invite_code_record.creator_id;
    ELSE
      -- Legacy: look up inviter by profile invite code
      SELECT p.id, p.name, p.energy, p.player_tier, p.user_id
      INTO v_inviter
      FROM public.profiles p
      WHERE p.invite_code = p_invite_code;
    END IF;

    IF v_inviter.id IS NOT NULL THEN
      v_inviter_tier := COALESCE(v_inviter.player_tier, 'jogador');
      
      CASE v_inviter_tier
        WHEN 'Criador' THEN
          v_transfer_amount := 15000;
          v_new_tier := 'Grão Mestre';
          v_new_role := 'grao_mestre';
        WHEN 'Grão Mestre' THEN
          v_transfer_amount := 1500;
          v_new_tier := 'Mestre';
          v_new_role := 'mestre';
        WHEN 'Mestre' THEN
          v_transfer_amount := 130;
          v_new_tier := 'Boom';
          v_new_role := 'jogador';
        WHEN 'Boom' THEN
          v_transfer_amount := 10;
          v_new_tier := 'Ploft';
          v_new_role := 'jogador';
        ELSE
          v_transfer_amount := 10;
          v_new_tier := 'Ploft';
          v_new_role := 'jogador';
      END CASE;
      
      IF v_inviter.energy < v_transfer_amount THEN
        RAISE EXCEPTION 'Quem te convidou não tem saldo suficiente (necessário: % k$)', v_transfer_amount;
      END IF;
      
      UPDATE public.profiles
      SET energy = energy - v_transfer_amount, updated_at = now()
      WHERE id = v_inviter.id;
    ELSE
      v_transfer_amount := 0;
      v_new_tier := 'Ploft';
      v_new_role := 'jogador';
    END IF;
  END IF;

  -- Create profile with transferred energy
  INSERT INTO public.profiles (user_id, name, emoji, invite_code, invited_by, invited_by_name, energy, player_tier)
  VALUES (v_user_id, p_name, p_emoji, v_new_invite_code, p_invite_code, 
          CASE WHEN v_is_master_code THEN 'SKEMA' ELSE v_inviter.name END,
          v_transfer_amount, v_new_tier)
  RETURNING id INTO v_new_profile_id;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create referral record if inviter exists
  IF v_inviter.id IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id, reward_amount, reward_credited)
    VALUES (v_inviter.id, v_new_profile_id, v_transfer_amount, true);
  END IF;

  -- Mark invite code as used (if from invite_codes table)
  IF v_invite_code_record IS NOT NULL THEN
    UPDATE public.invite_codes
    SET used_by_id = v_new_profile_id, used_at = now()
    WHERE id = v_invite_code_record.id;
  END IF;
END;
$$;
