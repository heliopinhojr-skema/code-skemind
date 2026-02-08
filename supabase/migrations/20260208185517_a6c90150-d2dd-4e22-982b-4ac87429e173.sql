
-- Fix infinite recursion in user_roles RLS policies
-- The "Service role manages roles" policy references user_roles itself, causing infinite recursion
-- Solution: use the has_role() SECURITY DEFINER function instead of direct subqueries

-- 1. Drop the problematic policy on user_roles
DROP POLICY IF EXISTS "Service role manages roles" ON public.user_roles;

-- 2. Recreate it using has_role() function (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Service role manages roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'master_admin'));

-- 3. Fix official_races policy that also directly queries user_roles
DROP POLICY IF EXISTS "Admins can manage races" ON public.official_races;

CREATE POLICY "Admins can manage races" 
ON public.official_races 
FOR ALL 
USING (public.has_role(auth.uid(), 'master_admin'));

-- 4. Fix skema_box policy
DROP POLICY IF EXISTS "Admins can update skema box" ON public.skema_box;

CREATE POLICY "Admins can update skema box" 
ON public.skema_box 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'master_admin'));

-- 5. Fix referrals policy
DROP POLICY IF EXISTS "Service role updates referrals" ON public.referrals;

CREATE POLICY "Service role updates referrals" 
ON public.referrals 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'master_admin'));
