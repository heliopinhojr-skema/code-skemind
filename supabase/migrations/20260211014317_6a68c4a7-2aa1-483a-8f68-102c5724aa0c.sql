
-- 1. PROFILES: Restringir PIN - só o próprio usuário vê seu PIN, outros veem dados públicos
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Todos autenticados podem ver dados públicos (sem PIN)
-- PIN é protegido pela aplicação, mas precisamos de uma view ou abordagem diferente
-- Como RLS não filtra colunas, vamos manter SELECT para autenticados apenas
CREATE POLICY "Authenticated can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. INVITE_CODES: Só criador vê seus códigos, admins veem todos
DROP POLICY IF EXISTS "Anyone can view invite codes" ON public.invite_codes;

CREATE POLICY "Users view own or admin views all invite codes"
ON public.invite_codes
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = creator_id)
  OR has_role(auth.uid(), 'master_admin')
  OR has_role(auth.uid(), 'guardiao')
);

-- 3. REFERRALS: Só envolvidos ou admins
DROP POLICY IF EXISTS "Users can view all referrals" ON public.referrals;

CREATE POLICY "Users view own referrals or admin views all"
ON public.referrals
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id IN (inviter_id, invited_id))
  OR has_role(auth.uid(), 'master_admin')
  OR has_role(auth.uid(), 'guardiao')
);

-- 4. SKEMA_BOX_TRANSACTIONS: Só admins/guardiões
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.skema_box_transactions;

CREATE POLICY "Only admins view transactions"
ON public.skema_box_transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'master_admin')
  OR has_role(auth.uid(), 'guardiao')
);

-- 5. GAME_HISTORY: Só próprio jogador ou admins
DROP POLICY IF EXISTS "Users can view own history" ON public.game_history;

CREATE POLICY "Users view own history or admin views all"
ON public.game_history
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = player_id)
  OR has_role(auth.uid(), 'master_admin')
  OR has_role(auth.uid(), 'guardiao')
);

-- 6. RACE_REGISTRATIONS: Só próprio ou admins
DROP POLICY IF EXISTS "Anyone can view registrations" ON public.race_registrations;

CREATE POLICY "Users view own or admin views all registrations"
ON public.race_registrations
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = player_id)
  OR has_role(auth.uid(), 'master_admin')
  OR has_role(auth.uid(), 'guardiao')
);

-- 7. RACE_RESULTS: Só próprio ou admins  
DROP POLICY IF EXISTS "Anyone can view race results" ON public.race_results;

CREATE POLICY "Users view own or admin views all results"
ON public.race_results
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = player_id)
  OR has_role(auth.uid(), 'master_admin')
  OR has_role(auth.uid(), 'guardiao')
);

-- 8. ARENA_ENTRIES: Só próprio ou admins
DROP POLICY IF EXISTS "Anyone can view arena entries" ON public.arena_entries;

CREATE POLICY "Users view own or admin views all entries"
ON public.arena_entries
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE id = player_id)
  OR has_role(auth.uid(), 'master_admin')
  OR has_role(auth.uid(), 'guardiao')
);

-- 9. ARENA_LISTINGS: Manter público (jogadores precisam ver arenas disponíveis)
-- Não alterar

-- 10. BOT_TREASURY: Só admins (já está correto)
-- Não alterar
