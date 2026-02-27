
-- 1. Add target_tier column to invite_codes
ALTER TABLE public.invite_codes 
ADD COLUMN target_tier text DEFAULT NULL;

-- 2. Create guardian_generate_invite_code RPC
CREATE OR REPLACE FUNCTION public.guardian_generate_invite_code(
  p_creator_profile_id uuid,
  p_target_tier text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_caller_id UUID;
  v_creator RECORD;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only guardian or master_admin can use this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role IN ('master_admin', 'guardiao')
  ) THEN
    RAISE EXCEPTION 'Apenas guardiões podem gerar convites multi-tier';
  END IF;

  -- Validate target tier
  IF p_target_tier NOT IN ('Criador', 'Grão Mestre', 'Mestre', 'Boom', 'Ploft') THEN
    RAISE EXCEPTION 'Tier inválido: %', p_target_tier;
  END IF;

  -- Verify caller owns this profile
  SELECT id, user_id, energy, player_tier
  INTO v_creator
  FROM public.profiles
  WHERE id = p_creator_profile_id AND user_id = v_caller_id;

  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado ou não pertence ao chamador';
  END IF;

  -- Generate unique SKGRD + 6 chars code
  LOOP
    v_code := 'SKGRD' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.invite_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO public.invite_codes (code, creator_id, target_tier)
  VALUES (v_code, p_creator_profile_id, p_target_tier);

  RETURN v_code;
END;
$$;

-- 3. Update register_player to respect target_tier from invite_codes
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
  v_generation_color TEXT := NULL;
  v_target_tier TEXT := NULL;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  LOOP
    v_new_invite_code := 'SK' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = v_new_invite_code);
  END LOOP;

  -- Check invite_codes table (SKINV/SKGRD codes)
  SELECT ic.id, ic.creator_id, ic.used_by_id, ic.shared_at, ic.target_tier
  INTO v_invite_code_record
  FROM public.invite_codes ic
  WHERE UPPER(TRIM(ic.code)) = UPPER(TRIM(p_invite_code));

  IF FOUND AND v_invite_code_record.used_by_id IS NOT NULL THEN
    RAISE EXCEPTION 'Código de convite já foi utilizado';
  END IF;

  -- Capture target_tier if present (SKGRD codes)
  IF FOUND AND v_invite_code_record.target_tier IS NOT NULL THEN
    v_target_tier := v_invite_code_record.target_tier;
  END IF;

  IF p_invite_code IN ('SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI') THEN
    v_is_master_code := true;
    v_new_tier := 'Criador';
    v_new_role := 'guardiao';
    v_transfer_amount := 200000;
    
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
    -- Get inviter
    IF FOUND THEN
      SELECT p.id, p.name, p.energy, p.player_tier, p.user_id
      INTO v_inviter
      FROM public.profiles p
      WHERE p.id = v_invite_code_record.creator_id;
    ELSE
      SELECT p.id, p.name, p.energy, p.player_tier, p.user_id
      INTO v_inviter
      FROM public.profiles p
      WHERE p.invite_code = p_invite_code;
    END IF;

    IF v_inviter.id IS NOT NULL THEN
      -- If target_tier is set (SKGRD guardian invite), use that instead of tier hierarchy
      IF v_target_tier IS NOT NULL THEN
        CASE v_target_tier
          WHEN 'Criador' THEN
            v_transfer_amount := 200000;
            v_new_tier := 'Criador';
            v_new_role := 'guardiao';
          WHEN 'Grão Mestre' THEN
            v_transfer_amount := 15000;
            v_new_tier := 'Grão Mestre';
            v_new_role := 'grao_mestre';
          WHEN 'Mestre' THEN
            v_transfer_amount := 1300;
            v_new_tier := 'Mestre';
            v_new_role := 'mestre';
          WHEN 'Boom' THEN
            v_transfer_amount := 130;
            v_new_tier := 'Boom';
            v_new_role := 'jogador';
          WHEN 'Ploft' THEN
            v_transfer_amount := 10;
            v_new_tier := 'Ploft';
            v_new_role := 'jogador';
          ELSE
            v_transfer_amount := 10;
            v_new_tier := 'Ploft';
            v_new_role := 'jogador';
        END CASE;
      ELSE
        -- Standard tier hierarchy
        v_inviter_tier := COALESCE(v_inviter.player_tier, 'jogador');
        
        CASE v_inviter_tier
          WHEN 'master_admin' THEN
            v_transfer_amount := 200000;
            v_new_tier := 'Criador';
            v_new_role := 'guardiao';
          WHEN 'Criador' THEN
            v_transfer_amount := 15000;
            v_new_tier := 'Grão Mestre';
            v_new_role := 'grao_mestre';
          WHEN 'Grão Mestre' THEN
            v_transfer_amount := 1300;
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
      END IF;
      
      -- Debit from inviter
      IF v_inviter.energy < v_transfer_amount THEN
        RAISE EXCEPTION 'Quem te convidou não tem saldo suficiente (necessário: % k$)', v_transfer_amount;
      END IF;
      
      UPDATE public.profiles
      SET energy = energy - v_transfer_amount, updated_at = now()
      WHERE id = v_inviter.id;

      SELECT generation_color INTO v_generation_color FROM profiles WHERE id = v_inviter.id;
    ELSE
      v_transfer_amount := 0;
      v_new_tier := 'Ploft';
      v_new_role := 'jogador';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, name, emoji, invite_code, invited_by, invited_by_name, energy, player_tier, generation_color)
  VALUES (v_user_id, p_name, p_emoji, v_new_invite_code, p_invite_code, 
          CASE WHEN v_is_master_code THEN 'SKEMA' ELSE v_inviter.name END,
          v_transfer_amount, v_new_tier, v_generation_color)
  RETURNING id INTO v_new_profile_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_inviter.id IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id, reward_amount, reward_credited)
    VALUES (v_inviter.id, v_new_profile_id, v_transfer_amount, true);
  END IF;

  IF v_invite_code_record.id IS NOT NULL THEN
    UPDATE public.invite_codes
    SET used_by_id = v_new_profile_id, used_at = now()
    WHERE id = v_invite_code_record.id;
  END IF;
END;
$$;
