-- Criar policy para guardians verem todos os roles (sem IF NOT EXISTS que não funciona em CREATE POLICY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Guardians can view all user roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Guardians can view all user roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), ''guardian''))';
  END IF;
END;
$$;