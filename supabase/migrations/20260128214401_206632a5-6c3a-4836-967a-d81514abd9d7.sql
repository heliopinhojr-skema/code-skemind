-- =====================================================
-- Migration: Adicionar logs na função register_player e corrigir Guardião Teste
-- =====================================================

-- 1. Atualizar função register_player com RAISE LOG para debugging
CREATE OR REPLACE FUNCTION public.register_player(
  p_name TEXT,
  p_emoji TEXT,
  p_invite_code TEXT
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_invite_code TEXT;
  v_inviter profiles;
  v_inviter_tier TEXT;
  v_inviter_is_master_admin BOOLEAN := FALSE;
  v_new_profile profiles;
  v_new_tier TEXT := 'jogador';
  v_initial_energy NUMERIC(12,2) := 10.00;
  v_new_role app_role := 'jogador';
  v_master_codes TEXT[] := ARRAY['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- LOG: Início da execução
  RAISE LOG '[register_player] Starting for user_id: %, invite_code: %', v_user_id, p_invite_code;
  
  -- Generate unique invite code for new player
  v_invite_code := 'SK' || UPPER(SUBSTRING(MD5(v_user_id::text || NOW()::text) FOR 6));
  
  -- Check if it's a master code
  IF UPPER(p_invite_code) = ANY(v_master_codes) THEN
    RAISE LOG '[register_player] Master code detected: %', p_invite_code;
    v_new_tier := 'jogador';
    v_initial_energy := 10.00;
    v_new_role := 'jogador';
  ELSE
    -- Find inviter by code
    SELECT * INTO v_inviter 
    FROM profiles 
    WHERE invite_code = UPPER(p_invite_code);
    
    IF v_inviter IS NOT NULL THEN
      -- LOG: Inviter encontrado
      v_inviter_tier := COALESCE(v_inviter.player_tier, 'jogador');
      
      -- Check if inviter is master_admin (dual check: role table OR player_tier)
      v_inviter_is_master_admin := has_role(v_inviter.user_id, 'master_admin') 
                                    OR v_inviter.player_tier = 'master_admin';
      
      RAISE LOG '[register_player] Inviter found: id=%, name=%, tier=%, is_master_admin=%', 
        v_inviter.id, v_inviter.name, v_inviter_tier, v_inviter_is_master_admin;
      
      -- Determine new player's tier based on inviter
      IF v_inviter_is_master_admin THEN
        v_new_tier := 'guardiao';
        v_initial_energy := 999999.00;
        v_new_role := 'guardiao';
        RAISE LOG '[register_player] Master admin inviter -> setting tier to GUARDIAO with energy 999999';
      ELSIF v_inviter_tier = 'guardiao' THEN
        v_new_tier := 'grao_mestre';
        v_initial_energy := 15000.00;
        v_new_role := 'grao_mestre';
        RAISE LOG '[register_player] Guardiao inviter -> setting tier to GRAO_MESTRE with energy 15000';
      ELSIF v_inviter_tier = 'grao_mestre' THEN
        v_new_tier := 'mestre';
        v_initial_energy := 1300.00;
        v_new_role := 'mestre';
        RAISE LOG '[register_player] Grao Mestre inviter -> setting tier to MESTRE with energy 1300';
      ELSE
        v_new_tier := 'jogador';
        v_initial_energy := 10.00;
        v_new_role := 'jogador';
        RAISE LOG '[register_player] Regular inviter (%) -> setting tier to JOGADOR with energy 10', v_inviter_tier;
      END IF;
    ELSE
      RAISE LOG '[register_player] No inviter found for code: %', p_invite_code;
      v_new_tier := 'jogador';
      v_initial_energy := 10.00;
      v_new_role := 'jogador';
    END IF;
  END IF;
  
  -- LOG: Valores finais antes do INSERT
  RAISE LOG '[register_player] FINAL VALUES: tier=%, energy=%, role=%', v_new_tier, v_initial_energy, v_new_role;
  
  -- Create profile
  INSERT INTO profiles (
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
    CURRENT_DATE::TEXT
  )
  RETURNING * INTO v_new_profile;
  
  RAISE LOG '[register_player] Profile created: id=%, tier=%, energy=%', v_new_profile.id, v_new_profile.player_tier, v_new_profile.energy;
  
  -- Create user role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, v_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE LOG '[register_player] Role inserted: user_id=%, role=%', v_user_id, v_new_role;
  
  -- Create referral record if invited by someone
  IF v_inviter IS NOT NULL THEN
    INSERT INTO referrals (inviter_id, invited_id, reward_amount)
    VALUES (v_inviter.id, v_new_profile.id, v_initial_energy);
    
    RAISE LOG '[register_player] Referral created: inviter=%, invited=%, reward=%', v_inviter.id, v_new_profile.id, v_initial_energy;
  END IF;
  
  RAISE LOG '[register_player] SUCCESS - Registration complete for %', p_name;
  
  RETURN v_new_profile;
END;
$$;

-- 2. Corrigir o usuário "Guardião Teste" que foi criado incorretamente
-- Profile ID: b161ef48-4d6e-46f3-8e5f-75b0eb9daa9e
-- User ID: 3673ebbc-3ea5-4524-b5ef-a39326fc750f
-- Inviter (Gabriel) Profile ID: e1d85db1-c259-43d8-94c1-eec2420dce51

-- 2a. Atualizar o profile
UPDATE profiles
SET 
  player_tier = 'guardiao',
  energy = 999999
WHERE id = 'b161ef48-4d6e-46f3-8e5f-75b0eb9daa9e';

-- 2b. Remover role incorreto
DELETE FROM user_roles 
WHERE user_id = '3673ebbc-3ea5-4524-b5ef-a39326fc750f' 
  AND role = 'jogador';

-- 2c. Adicionar role correto
INSERT INTO user_roles (user_id, role)
VALUES ('3673ebbc-3ea5-4524-b5ef-a39326fc750f', 'guardiao')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2d. Criar registro de referral faltante
INSERT INTO referrals (inviter_id, invited_id, reward_amount)
VALUES ('e1d85db1-c259-43d8-94c1-eec2420dce51', 'b161ef48-4d6e-46f3-8e5f-75b0eb9daa9e', 999999)
ON CONFLICT DO NOTHING;