
-- Update validate_invite_code to include target_tier info
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- 2. Check invite_codes table (SKINV/SKGRD codes - unique one-time-use)
  SELECT ic.id, ic.code, ic.creator_id, ic.used_by_id, ic.target_tier
  INTO v_invite
  FROM invite_codes ic
  WHERE UPPER(TRIM(ic.code)) = UPPER(TRIM(p_code));

  IF FOUND THEN
    -- Code found - check if already used
    IF v_invite.used_by_id IS NOT NULL THEN
      RETURN json_build_object('valid', false, 'reason', 'code_already_used');
    END IF;

    -- Get inviter details
    SELECT p.id, p.name, p.player_tier, p.user_id
    INTO v_inviter
    FROM profiles p
    WHERE p.id = v_invite.creator_id;

    IF NOT FOUND THEN
      RETURN json_build_object('valid', false);
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM user_roles WHERE user_id = v_inviter.user_id AND role IN ('master_admin', 'guardiao')
    ) INTO v_is_guardian;

    RETURN json_build_object(
      'valid', true,
      'inviter_id', v_inviter.id,
      'inviter_name', v_inviter.name,
      'inviter_tier', COALESCE(v_inviter.player_tier, 'jogador'),
      'inviter_is_guardian', v_is_guardian,
      'invite_code_id', v_invite.id,
      'target_tier', v_invite.target_tier
    );
  END IF;

  -- 3. Legacy: check profile invite codes (SK + 6 chars)
  SELECT p.id, p.name, p.player_tier, p.user_id
  INTO v_inviter
  FROM profiles p
  WHERE UPPER(TRIM(p.invite_code)) = UPPER(TRIM(p_code));

  IF FOUND THEN
    SELECT EXISTS(
      SELECT 1 FROM user_roles WHERE user_id = v_inviter.user_id AND role IN ('master_admin', 'guardiao')
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
$function$;
