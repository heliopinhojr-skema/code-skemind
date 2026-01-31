-- Fix: normalize invite code the same way as validate_invite_code (UPPER(TRIM()))
-- This prevents mismatches caused by hidden spaces/newlines when pasting invite codes.

CREATE OR REPLACE FUNCTION public.register_player(p_name text, p_emoji text, p_invite_code text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_invite_code TEXT;
  v_input_code TEXT;
  v_inviter profiles;
  v_inviter_tier TEXT;
  v_inviter_is_master_admin BOOLEAN := FALSE;
  v_new_profile profiles;
  v_new_tier TEXT := 'jogador';
  v_initial_energy NUMERIC(12,2) := 10.00;
  v_new_role app_role := 'jogador';
  v_master_codes TEXT[] := ARRAY['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Normalize invite code (keep behavior consistent with validate_invite_code)
  v_input_code := UPPER(TRIM(COALESCE(p_invite_code, '')));

  RAISE LOG '[register_player] Starting for user_id: %, invite_code(raw)="%", normalized="%"', v_user_id, p_invite_code, v_input_code;

  -- Generate unique invite code for new player
  v_invite_code := 'SK' || UPPER(SUBSTRING(MD5(v_user_id::text || NOW()::text) FOR 6));

  -- Master codes register as jogador
  IF v_input_code = ANY(v_master_codes) THEN
    RAISE LOG '[register_player] Master code detected: %', v_input_code;
    v_new_tier := 'jogador';
    v_initial_energy := 10.00;
    v_new_role := 'jogador';
  ELSE
    -- Find inviter by code (robust to casing/whitespace in DB as well)
    SELECT * INTO v_inviter
    FROM public.profiles
    WHERE UPPER(TRIM(invite_code)) = v_input_code;

    IF v_inviter IS NOT NULL THEN
      v_inviter_tier := COALESCE(v_inviter.player_tier, 'jogador');

      -- Check if inviter is master_admin (dual check: role table OR player_tier)
      v_inviter_is_master_admin := has_role(v_inviter.user_id, 'master_admin')
                                    OR v_inviter.player_tier = 'master_admin';

      RAISE LOG '[register_player] Inviter found: id=%, name=%, tier=%, is_master_admin=%',
        v_inviter.id, v_inviter.name, v_inviter_tier, v_inviter_is_master_admin;

      IF v_inviter_is_master_admin THEN
        v_new_tier := 'guardiao';
        v_initial_energy := 999999.00;
        v_new_role := 'guardiao';
        RAISE LOG '[register_player] Master admin inviter -> setting tier=GUARDIAO energy=999999';
      ELSIF v_inviter_tier = 'guardiao' THEN
        v_new_tier := 'grao_mestre';
        v_initial_energy := 15000.00;
        v_new_role := 'grao_mestre';
        RAISE LOG '[register_player] Guardiao inviter -> setting tier=GRAO_MESTRE energy=15000';
      ELSIF v_inviter_tier = 'grao_mestre' THEN
        v_new_tier := 'mestre';
        v_initial_energy := 1300.00;
        v_new_role := 'mestre';
        RAISE LOG '[register_player] Grao Mestre inviter -> setting tier=MESTRE energy=1300';
      ELSE
        v_new_tier := 'jogador';
        v_initial_energy := 10.00;
        v_new_role := 'jogador';
        RAISE LOG '[register_player] Regular inviter (%) -> setting tier=JOGADOR energy=10', v_inviter_tier;
      END IF;
    ELSE
      RAISE LOG '[register_player] No inviter found for code: %', v_input_code;
      v_new_tier := 'jogador';
      v_initial_energy := 10.00;
      v_new_role := 'jogador';
    END IF;
  END IF;

  RAISE LOG '[register_player] FINAL VALUES: tier=%, energy=%, role=%', v_new_tier, v_initial_energy, v_new_role;

  INSERT INTO public.profiles (
    user_id,
    name,
    emoji,
    invite_code,
    invited_by,
    invited_by_name,
    energy,
    player_tier,
    last_refill_date
  ) VALUES (
    v_user_id,
    p_name,
    p_emoji,
    v_invite_code,
    v_inviter.id,
    v_inviter.name,
    v_initial_energy,
    v_new_tier,
    CURRENT_DATE
  )
  RETURNING * INTO v_new_profile;

  RAISE LOG '[register_player] Profile created: id=%, tier=%, energy=%', v_new_profile.id, v_new_profile.player_tier, v_new_profile.energy;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE LOG '[register_player] Role inserted: user_id=%, role=%', v_user_id, v_new_role;

  IF v_inviter IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id, reward_amount)
    VALUES (v_inviter.id, v_new_profile.id, v_initial_energy);

    RAISE LOG '[register_player] Referral created: inviter=%, invited=%, reward=%', v_inviter.id, v_new_profile.id, v_initial_energy;
  END IF;

  RAISE LOG '[register_player] SUCCESS - Registration complete for %', p_name;
  RETURN v_new_profile;
END;
$function$;