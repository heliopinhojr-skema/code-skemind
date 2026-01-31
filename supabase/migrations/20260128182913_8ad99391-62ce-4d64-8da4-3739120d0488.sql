-- Atualizar função register_player para suportar convites de guardian → keeper
CREATE OR REPLACE FUNCTION public.register_player(p_name text, p_emoji text, p_invite_code text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter public.profiles;
  v_inviter_tier text;
  v_inviter_is_guardian boolean;
  v_new_tier text;
  v_initial_energy DECIMAL;
  v_new_role app_role;
  v_new_code TEXT;
  v_profile public.profiles;
  v_master_codes TEXT[] := ARRAY['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
BEGIN
  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a profile';
  END IF;

  -- Buscar inviter pelo código de convite
  SELECT * INTO v_inviter FROM public.profiles WHERE invite_code = UPPER(p_invite_code);
  
  -- Validar código de convite
  IF v_inviter IS NULL AND NOT (UPPER(p_invite_code) = ANY(v_master_codes)) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  -- Determinar tier, energia inicial e role do novo jogador
  IF v_inviter IS NOT NULL THEN
    -- Verificar se o inviter é um guardian (master admin)
    v_inviter_is_guardian := has_role(v_inviter.user_id, 'guardian');
    v_inviter_tier := COALESCE(v_inviter.player_tier, 'player');
    
    IF v_inviter_is_guardian THEN
      -- Guardian (master admin) convida → Keeper com energia infinita
      v_new_tier := 'keeper';
      v_initial_energy := 999999.00;
      v_new_role := 'keeper';
    ELSE
      CASE v_inviter_tier
        WHEN 'keeper' THEN
          -- Keeper convida → Grão Mestre com k$15.000
          v_new_tier := 'grandmaster';
          v_initial_energy := 15000.00;
          v_new_role := 'grandmaster';
        WHEN 'grandmaster' THEN
          -- Grão Mestre convida → Mestre com k$1.300
          v_new_tier := 'master';
          v_initial_energy := 1300.00;
          v_new_role := 'master';
        ELSE
          -- Mestre ou Player convida → Player com k$10
          v_new_tier := 'player';
          v_initial_energy := 10.00;
          v_new_role := 'player';
      END CASE;
    END IF;
  ELSE
    -- Master code = player comum com k$10
    v_new_tier := 'player';
    v_initial_energy := 10.00;
    v_new_role := 'player';
  END IF;
  
  -- Gerar código de convite único
  LOOP
    v_new_code := 'SK' || UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = v_new_code);
  END LOOP;
  
  -- Criar profile com tier e energia inicial
  INSERT INTO public.profiles (
    user_id, name, emoji, invite_code, 
    invited_by, invited_by_name, 
    energy, player_tier
  )
  VALUES (
    auth.uid(), p_name, p_emoji, v_new_code,
    v_inviter.id, v_inviter.name,
    v_initial_energy, v_new_tier
  )
  RETURNING * INTO v_profile;
  
  -- Atribuir role baseado no tier
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), v_new_role);
  
  -- Registrar referral se houver inviter (para histórico)
  IF v_inviter IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id, reward_amount)
    VALUES (v_inviter.id, v_profile.id, v_initial_energy);
  END IF;
  
  RETURN v_profile;
END;
$function$;