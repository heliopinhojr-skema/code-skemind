
-- Fix permissive RLS policies

-- Referrals: only authenticated users can insert, and only service/edge functions update
DROP POLICY "Users can insert referrals" ON public.referrals;
CREATE POLICY "Authenticated users can insert referrals" ON public.referrals 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Service updates referrals" ON public.referrals;
CREATE POLICY "Service role updates referrals" ON public.referrals 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  );

-- Skema box transactions: only authenticated insert
DROP POLICY "Insert via service" ON public.skema_box_transactions;
CREATE POLICY "Authenticated insert transactions" ON public.skema_box_transactions 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Race registrations: only authenticated users
DROP POLICY "Users can register for races" ON public.race_registrations;
CREATE POLICY "Authenticated users can register" ON public.race_registrations 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
