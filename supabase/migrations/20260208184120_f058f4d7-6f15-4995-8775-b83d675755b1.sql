
-- validate_invite_code: check if an invite code is valid and return inviter info
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter RECORD;
  v_is_master BOOLEAN;
  v_is_guardian BOOLEAN;
BEGIN
  -- Check master codes
  IF p_code IN ('SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI') THEN
    RETURN json_build_object(
      'valid', true,
      'inviter_id', NULL,
      'inviter_name', 'SKEMA',
      'inviter_tier', 'master_admin',
      'inviter_is_guardian', true
    );
  END IF;

  -- Look up inviter by invite code
  SELECT p.id, p.name, p.player_tier, p.user_id
  INTO v_inviter
  FROM public.profiles p
  WHERE p.invite_code = p_code;

  IF v_inviter IS NULL THEN
    -- Check format SK + 6 chars - accept even without inviter
    IF p_code ~ '^SK[A-Z0-9]{6}$' THEN
      RETURN json_build_object(
        'valid', true,
        'inviter_id', NULL,
        'inviter_name', 'Jogador SKEMA',
        'inviter_tier', 'jogador',
        'inviter_is_guardian', false
      );
    END IF;
    
    RETURN json_build_object('valid', false);
  END IF;

  -- Check if inviter is guardian
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
END;
$$;
