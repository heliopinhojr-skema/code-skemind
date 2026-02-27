
-- 1. Profiles: restringir SELECT para próprio perfil + admins/guardiões
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users view own profile or admin views all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'guardiao'::app_role)
);

-- 2. Invite codes: já está restrito por creator_id, mas vamos reforçar
DROP POLICY IF EXISTS "Users view own or admin views all invite codes" ON public.invite_codes;

CREATE POLICY "Users view own or admin views all invite codes"
ON public.invite_codes
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = invite_codes.creator_id)
  OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'guardiao'::app_role)
);
