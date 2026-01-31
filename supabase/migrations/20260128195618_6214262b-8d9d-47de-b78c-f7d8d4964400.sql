-- Criar função para alterar tier e role de usuários (apenas guardians podem usar)
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
  -- Verificar se quem chama é guardian
  IF NOT has_role(auth.uid(), 'guardian') THEN
    RAISE EXCEPTION 'Access denied: only guardians can change roles';
  END IF;

  -- Atualizar tier no profile
  UPDATE public.profiles
  SET 
    player_tier = p_new_tier,
    -- Se for keeper, energia infinita
    energy = CASE WHEN p_new_tier = 'keeper' THEN 999999 ELSE energy END
  WHERE user_id = p_target_user_id;

  -- Remover roles existentes (exceto guardian para não perder acesso admin)
  DELETE FROM public.user_roles 
  WHERE user_id = p_target_user_id 
    AND role != 'guardian';
  
  -- Inserir novo role (se não for duplicata)
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Corrigir dados do usuário "Guardiao 1" (convidado por guardian, deve ser keeper)
UPDATE public.profiles
SET player_tier = 'keeper', energy = 999999
WHERE name = 'Guardiao 1';

-- Remover role player do Guardiao 1 e adicionar keeper
DELETE FROM public.user_roles 
WHERE user_id = '538d9cb0-5269-4855-a783-57b269219935' AND role = 'player';

INSERT INTO public.user_roles (user_id, role)
VALUES ('538d9cb0-5269-4855-a783-57b269219935', 'keeper')
ON CONFLICT (user_id, role) DO NOTHING;