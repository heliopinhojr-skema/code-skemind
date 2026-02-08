
-- =====================================================
-- REGISTER_PLAYER v2: Auto-transfer de energia por tier
-- =====================================================
-- Hierarquia confirmada:
--   master_admin (HX) → Criador: 200.000 k$
--   Criador → Grão Mestre: 15.000 k$
--   Grão Mestre (grao_mestre) → Mestre: 1.500 k$
--   Mestre → Boom: 130 k$
--   Boom/jogador → Ploft: 10 k$
-- =====================================================

CREATE OR REPLACE FUNCTION public.register_player(p_name text, p_emoji text, p_invite_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate unique invite code (SK + 6 random chars)
  v_new_invite_code := 'SK' || upper(substr(md5(random()::text), 1, 6));

  -- Check if it's a master invite code
  IF p_invite_code IN ('SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI') THEN
    v_is_master_code := true;
    -- Master codes create Criadores with 200k transferred from HX
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
    
    -- If HX exists, check balance and debit
    IF v_inviter.id IS NOT NULL THEN
      IF v_inviter.energy < v_transfer_amount THEN
        RAISE EXCEPTION 'Conta raiz sem saldo suficiente para convidar (necessário: % k$)', v_transfer_amount;
      END IF;
      
      -- Debit HX
      UPDATE public.profiles
      SET energy = energy - v_transfer_amount, updated_at = now()
      WHERE id = v_inviter.id;
    END IF;
  ELSE
    -- Look up inviter by invite code
    SELECT p.id, p.name, p.energy, p.player_tier, p.user_id
    INTO v_inviter
    FROM public.profiles p
    WHERE p.invite_code = p_invite_code;

    IF v_inviter.id IS NOT NULL THEN
      v_inviter_tier := COALESCE(v_inviter.player_tier, 'jogador');
      
      -- Determine transfer amount and new tier based on inviter's tier
      CASE v_inviter_tier
        WHEN 'Criador' THEN
          -- Criador convida Grão Mestre: 15.000 k$
          v_transfer_amount := 15000;
          v_new_tier := 'Grão Mestre';
          v_new_role := 'grao_mestre';
        WHEN 'Grão Mestre' THEN
          -- Grão Mestre convida Mestre: 1.500 k$
          v_transfer_amount := 1500;
          v_new_tier := 'Mestre';
          v_new_role := 'mestre';
        WHEN 'Mestre' THEN
          -- Mestre convida Boom: 130 k$
          v_transfer_amount := 130;
          v_new_tier := 'Boom';
          v_new_role := 'jogador';
        WHEN 'Boom' THEN
          -- Boom convida Ploft: 10 k$
          v_transfer_amount := 10;
          v_new_tier := 'Ploft';
          v_new_role := 'jogador';
        ELSE
          -- jogador/Ploft convida outro Ploft: 10 k$
          v_transfer_amount := 10;
          v_new_tier := 'Ploft';
          v_new_role := 'jogador';
      END CASE;
      
      -- Check inviter balance
      IF v_inviter.energy < v_transfer_amount THEN
        RAISE EXCEPTION 'Quem te convidou não tem saldo suficiente (necessário: % k$)', v_transfer_amount;
      END IF;
      
      -- Debit inviter
      UPDATE public.profiles
      SET energy = energy - v_transfer_amount, updated_at = now()
      WHERE id = v_inviter.id;
    ELSE
      -- Unknown inviter (valid format but not found) - default tier, no transfer
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
END;
$function$;
