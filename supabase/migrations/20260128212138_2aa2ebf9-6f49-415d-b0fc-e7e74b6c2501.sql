-- Add unique constraint on (user_id, role) for user_roles table
-- This is needed for the ON CONFLICT clause in set_user_role_and_tier function

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);