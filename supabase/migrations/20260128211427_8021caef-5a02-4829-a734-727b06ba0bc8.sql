-- ============================================
-- MIGRAÇÃO: Nomenclatura de Tiers para Português
-- Ordem corrigida: migrar dados ANTES da constraint
-- ============================================

-- PASSO 1: Dropar funções com CASCADE (remove policies dependentes)
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role_and_tier(uuid, app_role, text) CASCADE;

-- PASSO 2: Adicionar coluna temporária em user_roles
ALTER TABLE public.user_roles ADD COLUMN role_new text;

-- PASSO 3: Migrar dados de user_roles para texto temporário
UPDATE public.user_roles SET role_new = 
  CASE role::text
    WHEN 'guardian' THEN 'master_admin'
    WHEN 'keeper' THEN 'guardiao'
    WHEN 'grandmaster' THEN 'grao_mestre'
    WHEN 'master' THEN 'mestre'
    WHEN 'player' THEN 'jogador'
    WHEN 'moderator' THEN 'moderator'
  END;

-- PASSO 4: Remover coluna antiga
ALTER TABLE public.user_roles DROP COLUMN role;

-- PASSO 5: Dropar enum antigo
DROP TYPE public.app_role;

-- PASSO 6: Criar novo enum com valores em português
CREATE TYPE public.app_role AS ENUM (
  'master_admin',
  'moderator',
  'guardiao',
  'grao_mestre',
  'mestre',
  'jogador'
);

-- PASSO 7: Converter coluna temporária para o novo enum
ALTER TABLE public.user_roles ADD COLUMN role public.app_role;
UPDATE public.user_roles SET role = role_new::public.app_role;
ALTER TABLE public.user_roles DROP COLUMN role_new;
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;

-- PASSO 8: Recriar função has_role com novo enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- PASSO 9: Recriar policies com novos nomes de roles
CREATE POLICY "Master admins can create races" 
ON public.official_races 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admins can update races" 
ON public.official_races 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admins can view all registrations" 
ON public.race_registrations 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admins can view skema_box" 
ON public.skema_box 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admins can view transactions" 
ON public.skema_box_transactions 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

-- PASSO 10: Remover constraint antiga de player_tier
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_player_tier_check;

-- PASSO 11: PRIMEIRO migrar valores de player_tier existentes
UPDATE public.profiles SET player_tier = 
  CASE player_tier
    WHEN 'guardian' THEN 'master_admin'
    WHEN 'keeper' THEN 'guardiao'
    WHEN 'grandmaster' THEN 'grao_mestre'
    WHEN 'master' THEN 'mestre'
    WHEN 'player' THEN 'jogador'
    ELSE 'jogador'
  END;

-- PASSO 12: DEPOIS adicionar nova constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_player_tier_check 
CHECK (player_tier IN ('master_admin', 'guardiao', 'grao_mestre', 'mestre', 'jogador'));

-- PASSO 13: Corrigir o usuário "Guardiao Teste" para 'guardiao' com energia infinita
UPDATE public.profiles
SET player_tier = 'guardiao', energy = 999999
WHERE id = '06808b6d-ef8a-45f3-8f90-8c3594398d9f';

-- PASSO 14: Atualizar função get_player_tier
CREATE OR REPLACE FUNCTION public.get_player_tier(p_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(player_tier, 'jogador') 
  FROM public.profiles 
  WHERE id = p_profile_id
$$;

-- PASSO 15: Atualizar função validate_invite_code
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upper_code TEXT;
  v_inviter RECORD;
  v_is_master_admin BOOLEAN;
  v_master_codes TEXT[] := ARRAY['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
BEGIN
  v_upper_code := UPPER(TRIM(p_code));
  
  IF v_upper_code = ANY(v_master_codes) THEN
    RETURN jsonb_build_object(
      'valid', true,
      'inviter_id', null,
      'inviter_name', 'SKEMA',
      'inviter_tier', 'master_code',
      'inviter_is_guardian', false
    );
  END IF;
  
  IF NOT (v_upper_code ~ '^SK[A-Z0-9]{6}$') THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  
  SELECT id, name, player_tier, user_id
  INTO v_inviter
  FROM profiles
  WHERE invite_code = v_upper_code;
  
  IF v_inviter IS NULL THEN
    RETURN jsonb_build_object(
      'valid', true,
      'inviter_id', null,
      'inviter_name', 'Jogador SKEMA',
      'inviter_tier', 'jogador',
      'inviter_is_guardian', false
    );
  END IF;
  
  SELECT has_role(v_inviter.user_id, 'master_admin') INTO v_is_master_admin;
  
  RETURN jsonb_build_object(
    'valid', true,
    'inviter_id', v_inviter.id,
    'inviter_name', v_inviter.name,
    'inviter_tier', COALESCE(v_inviter.player_tier, 'jogador'),
    'inviter_is_guardian', COALESCE(v_is_master_admin, false)
  );
END;
$$;

-- PASSO 16: Atualizar função register_player
CREATE OR REPLACE FUNCTION public.register_player(p_name text, p_emoji text, p_invite_code text)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter public.profiles;
  v_inviter_tier text;
  v_inviter_is_master_admin boolean;
  v_new_tier text;
  v_initial_energy DECIMAL;
  v_new_role app_role;
  v_new_code TEXT;
  v_profile public.profiles;
  v_master_codes TEXT[] := ARRAY['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a profile';
  END IF;

  SELECT * INTO v_inviter FROM public.profiles WHERE invite_code = UPPER(p_invite_code);
  
  IF v_inviter IS NULL AND NOT (UPPER(p_invite_code) = ANY(v_master_codes)) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  IF v_inviter IS NOT NULL THEN
    v_inviter_is_master_admin := has_role(v_inviter.user_id, 'master_admin') 
                                  OR v_inviter.player_tier = 'master_admin';
    v_inviter_tier := COALESCE(v_inviter.player_tier, 'jogador');
    
    IF v_inviter_is_master_admin THEN
      v_new_tier := 'guardiao';
      v_initial_energy := 999999.00;
      v_new_role := 'guardiao';
    ELSE
      CASE v_inviter_tier
        WHEN 'guardiao' THEN
          v_new_tier := 'grao_mestre';
          v_initial_energy := 15000.00;
          v_new_role := 'grao_mestre';
        WHEN 'grao_mestre' THEN
          v_new_tier := 'mestre';
          v_initial_energy := 1300.00;
          v_new_role := 'mestre';
        ELSE
          v_new_tier := 'jogador';
          v_initial_energy := 10.00;
          v_new_role := 'jogador';
      END CASE;
    END IF;
  ELSE
    v_new_tier := 'jogador';
    v_initial_energy := 10.00;
    v_new_role := 'jogador';
  END IF;
  
  LOOP
    v_new_code := 'SK' || UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = v_new_code);
  END LOOP;
  
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
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), v_new_role);
  
  IF v_inviter IS NOT NULL THEN
    INSERT INTO public.referrals (inviter_id, invited_id, reward_amount)
    VALUES (v_inviter.id, v_profile.id, v_initial_energy);
  END IF;
  
  RETURN v_profile;
END;
$$;

-- PASSO 17: Recriar função set_user_role_and_tier
CREATE OR REPLACE FUNCTION public.set_user_role_and_tier(p_target_user_id uuid, p_new_role app_role, p_new_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'master_admin') THEN
    RAISE EXCEPTION 'Access denied: only master_admin can change roles';
  END IF;

  UPDATE public.profiles
  SET 
    player_tier = p_new_tier,
    energy = CASE 
      WHEN p_new_tier IN ('master_admin', 'guardiao') THEN 999999 
      ELSE energy 
    END
  WHERE user_id = p_target_user_id;

  DELETE FROM public.user_roles 
  WHERE user_id = p_target_user_id 
    AND role != 'master_admin';
  
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;