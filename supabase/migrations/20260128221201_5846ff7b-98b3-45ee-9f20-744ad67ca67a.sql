-- Fix register_player to use direct comparison (consistent with validate_invite_code)
CREATE OR REPLACE FUNCTION public.register_player(
  p_name TEXT,
  p_emoji TEXT,
  p_invite_code TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id UUID;
  v_new_profile public.profiles;
  v_inviter public.profiles;
  v_new_invite_code TEXT;
  v_input_code TEXT;
  v_new_tier TEXT;
  v_new_energy INTEGER;
  v_inviter_is_master BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id) THEN
    SELECT * INTO v_new_profile FROM public.profiles WHERE user_id = v_user_id;
    RETURN v_new_profile;
  END IF;
  
  -- Generate unique invite code
  v_new_invite_code := 'SK' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
  
  -- Normalize input code (same as validate_invite_code)
  v_input_code := UPPER(TRIM(COALESCE(p_invite_code, '')));
  
  RAISE LOG '[register_player] Looking for inviter with code: %', v_input_code;
  
  -- Find inviter using DIRECT comparison (consistent with validate_invite_code)
  SELECT * INTO v_inviter
  FROM public.profiles
  WHERE invite_code = v_input_code;
  
  IF v_inviter.id IS NOT NULL THEN
    RAISE LOG '[register_player] Found inviter: % (id: %, tier: %)', v_inviter.name, v_inviter.id, v_inviter.player_tier;
    
    -- Check if inviter is master_admin (check both role and tier for robustness)
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = v_inviter.user_id AND role = 'master_admin'
    ) INTO v_inviter_is_master;
    
    -- Also check player_tier as fallback
    IF NOT v_inviter_is_master AND v_inviter.player_tier = 'master_admin' THEN
      v_inviter_is_master := TRUE;
    END IF;
    
    RAISE LOG '[register_player] Inviter is master_admin: %', v_inviter_is_master;
    
    -- Determine tier based on inviter
    IF v_inviter_is_master THEN
      v_new_tier := 'guardiao';
      v_new_energy := 999999;
      RAISE LOG '[register_player] New user will be GUARDIAO with infinite energy';
    ELSIF v_inviter.player_tier = 'guardiao' THEN
      v_new_tier := 'grao_mestre';
      v_new_energy := 15000;
    ELSIF v_inviter.player_tier = 'grao_mestre' THEN
      v_new_tier := 'mestre';
      v_new_energy := 1300;
    ELSE
      v_new_tier := 'jogador';
      v_new_energy := 10;
    END IF;
  ELSE
    RAISE LOG '[register_player] No inviter found for code: %', v_input_code;
    v_new_tier := 'jogador';
    v_new_energy := 10;
  END IF;
  
  RAISE LOG '[register_player] Final tier: %, energy: %', v_new_tier, v_new_energy;
  
  -- Create profile
  INSERT INTO public.profiles (
    user_id,
    name,
    emoji,
    invite_code,
    invited_by,
    invited_by_name,
    player_tier,
    energy
  ) VALUES (
    v_user_id,
    p_name,
    p_emoji,
    v_new_invite_code,
    v_inviter.id,
    v_inviter.name,
    v_new_tier,
    v_new_energy
  )
  RETURNING * INTO v_new_profile;
  
  -- Create referral record if there was an inviter
  IF v_inviter.id IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id, reward_amount, reward_credited)
    VALUES (v_inviter.id, v_new_profile.id, 5, FALSE);
    
    -- Also add guardiao role if tier is guardiao
    IF v_new_tier = 'guardiao' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'guardiao')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN v_new_profile;
END;
$function$;