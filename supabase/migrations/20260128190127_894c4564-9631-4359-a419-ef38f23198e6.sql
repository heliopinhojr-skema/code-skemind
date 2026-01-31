-- Função para validar códigos de convite (acessível para usuários anônimos)
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upper_code TEXT;
  v_inviter RECORD;
  v_is_guardian BOOLEAN;
  v_master_codes TEXT[] := ARRAY['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
BEGIN
  v_upper_code := UPPER(TRIM(p_code));
  
  -- Verificar códigos master
  IF v_upper_code = ANY(v_master_codes) THEN
    RETURN jsonb_build_object(
      'valid', true,
      'inviter_id', null,
      'inviter_name', 'SKEMA',
      'inviter_tier', 'master_code',
      'inviter_is_guardian', false
    );
  END IF;
  
  -- Verificar formato SK + 6 chars
  IF NOT (v_upper_code ~ '^SK[A-Z0-9]{6}$') THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  
  -- Buscar convidador
  SELECT id, name, player_tier, user_id
  INTO v_inviter
  FROM profiles
  WHERE invite_code = v_upper_code;
  
  IF v_inviter IS NULL THEN
    -- Formato válido mas não encontrado
    RETURN jsonb_build_object(
      'valid', true,
      'inviter_id', null,
      'inviter_name', 'Jogador SKEMA',
      'inviter_tier', 'player',
      'inviter_is_guardian', false
    );
  END IF;
  
  -- Verificar se é guardian
  SELECT has_role(v_inviter.user_id, 'guardian') INTO v_is_guardian;
  
  RETURN jsonb_build_object(
    'valid', true,
    'inviter_id', v_inviter.id,
    'inviter_name', v_inviter.name,
    'inviter_tier', COALESCE(v_inviter.player_tier, 'player'),
    'inviter_is_guardian', COALESCE(v_is_guardian, false)
  );
END;
$$;