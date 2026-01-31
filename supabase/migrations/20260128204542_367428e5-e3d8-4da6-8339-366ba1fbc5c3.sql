-- 1. Remover constraint antiga
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_player_tier_check;

-- 2. Criar nova constraint incluindo 'guardian'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_player_tier_check 
CHECK (player_tier IN ('guardian', 'keeper', 'grandmaster', 'master', 'player'));

-- 3. Atualizar função set_user_role_and_tier para energia infinita em guardian também
CREATE OR REPLACE FUNCTION public.set_user_role_and_tier(
  p_target_user_id UUID,
  p_new_role app_role,
  p_new_tier TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'guardian') THEN
    RAISE EXCEPTION 'Access denied: only guardians can change roles';
  END IF;

  UPDATE public.profiles
  SET 
    player_tier = p_new_tier,
    energy = CASE 
      WHEN p_new_tier IN ('guardian', 'keeper') THEN 999999 
      ELSE energy 
    END
  WHERE user_id = p_target_user_id;

  DELETE FROM public.user_roles 
  WHERE user_id = p_target_user_id 
    AND role != 'guardian';
  
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- 4. Corrigir perfil do Master Admin Gabriel
UPDATE public.profiles
SET player_tier = 'guardian', energy = 999999
WHERE user_id = '971e250b-a4e7-42da-856e-3c6eb0c7a131';