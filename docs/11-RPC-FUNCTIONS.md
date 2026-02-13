# 11 — Funções RPC (→ Services Laravel)

## Visão Geral

As 16 funções RPC do Supabase devem ser convertidas em **Services** e **Controllers** no Laravel, mantendo a mesma lógica atômica via `DB::transaction()`.

---

## 1. `register_player`

**Propósito**: Registro atômico de novo jogador com hierarquia de tiers.

**Parâmetros**: `p_name`, `p_emoji`, `p_invite_code`

**Lógica**:
1. Gera `invite_code` único (SK + 6 chars)
2. Busca invite_code na tabela `invite_codes` (SKINV) → verifica não usado
3. Se código master → tier = Criador, role = guardiao, k$ 200.000 do HX
4. Se SKINV/Legacy → determina tier pelo tier do convidador (ver [03-TIER-HIERARCHY](./03-TIER-HIERARCHY.md))
5. Debita convidador
6. Herda `generation_color` do convidador
7. Insere profile
8. Insere user_role
9. Insere referral
10. Marca invite_code como usado

**Laravel**: `RegisterPlayerService::execute()`

---

## 2. `validate_invite_code`

**Propósito**: Valida código de convite (3 tipos).

**Parâmetros**: `p_code`

**Retorno**: JSON com `valid`, `inviter_id`, `inviter_name`, `inviter_tier`, `inviter_is_guardian`, `invite_code_id`

**Lógica**: Ver [04-INVITE-SYSTEM](./04-INVITE-SYSTEM.md)

**Laravel**: `InviteCodeService::validate()`

---

## 3. `generate_invite_code`

**Propósito**: Gera código SKINV único.

**Parâmetros**: `p_creator_profile_id`

**Validação**: Verifica `auth.uid()` é dono do profile.

**Lógica**: Loop gera `SKINV` + 6 chars até ser único.

**Laravel**: `InviteCodeService::generate()`

---

## 4. `share_invite_code`

**Propósito**: Marca código como compartilhado.

**Parâmetros**: `p_code_id`, `p_player_id`, `p_shared_to_name` (opcional)

**Validação**: Código pertence ao jogador, não foi usado.

**Ação**: `UPDATE invite_codes SET shared_at = now()`

---

## 5. `cancel_invite_code`

**Propósito**: Cancela/deleta código não utilizado.

**Parâmetros**: `p_code_id`, `p_player_id`

**Validação**: Código pertence ao jogador, `used_by_id IS NULL`.

**Ação**: `DELETE FROM invite_codes WHERE id = p_code_id`

---

## 6. `choose_generation_color`

**Propósito**: Criador escolhe cor de geração (propaga para descendentes).

**Parâmetros**: `p_player_id`, `p_color`

**Validação**:
- Jogador é Criador
- Cor ainda não foi escolhida (NULL)
- Cor não tomada por outro Criador

**Ação**:
1. Define cor no Criador
2. **CTE recursivo** propaga para TODOS descendentes via `invited_by = invite_code`

```sql
WITH RECURSIVE descendant_ids AS (
  SELECT id, invite_code FROM profiles WHERE invited_by = v_player.invite_code
  UNION ALL
  SELECT p.id, p.invite_code FROM profiles p 
  INNER JOIN descendant_ids d ON p.invited_by = d.invite_code
)
UPDATE profiles SET generation_color = p_color WHERE id IN (SELECT id FROM descendant_ids);
```

---

## 7. `update_player_energy`

**Propósito**: Atualiza energia do jogador atomicamente.

**Parâmetros**: `p_player_id`, `p_amount` (pode ser negativo)

**Ação**: `UPDATE profiles SET energy = GREATEST(0, energy + p_amount)`

---

## 8. `update_skema_box`

**Propósito**: Atualiza saldo do Skema Box e registra transação.

**Parâmetros**: `p_amount`, `p_type`, `p_description`

**Ação**:
1. `UPDATE skema_box SET balance = GREATEST(0, balance + p_amount)`
2. `INSERT INTO skema_box_transactions (type, amount, balance_after, description)`

**Retorno**: Novo saldo

---

## 9. `update_bot_treasury`

**Propósito**: Atualiza saldo do Bot Treasury.

**Parâmetros**: `p_amount`, `p_description`

**Ação**: `UPDATE bot_treasury SET balance = balance + p_amount`

**Retorno**: Novo saldo

---

## 10. `has_role`

**Propósito**: Verifica se usuário tem determinada role (SECURITY DEFINER para evitar recursão RLS).

**Parâmetros**: `_user_id`, `_role`

**Retorno**: BOOLEAN

```sql
SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
```

**Laravel**: Gate `has_role` ou Policy.

---

## 11. `set_user_role_and_tier`

**Propósito**: Master admin altera role e tier de um jogador.

**Parâmetros**: `p_target_user_id`, `p_new_role`, `p_new_tier`

**Validação**: Apenas `master_admin`.

**Ação**:
1. Insert/update em `user_roles` (remove roles antigas)
2. Update `profiles.player_tier`

---

## 12. `admin_adjust_player_energy`

**Propósito**: Master admin ajusta saldo de jogador.

**Parâmetros**: `p_player_id`, `p_new_energy`, `p_reason`

**Validação**: Apenas `master_admin`.

**Ação**: `UPDATE profiles SET energy = GREATEST(0, p_new_energy)`

---

## 13. `admin_set_player_status`

**Propósito**: Bloquear/desbloquear jogador.

**Parâmetros**: `p_player_id`, `p_status`

**Validação**: Apenas `master_admin`. Status válidos: `active`, `blocked`, `penalized`.

---

## 14. `admin_delete_player`

**Propósito**: Deleção atômica completa de jogador e descendentes.

**Parâmetros**: `p_player_id`

**Lógica complexa**:
1. Retorna energia ao convidador (se master code → retorna ao HX)
2. **CTE recursivo** encontra TODOS descendentes
3. Para cada descendente: soma energia e retorna ao ascendente
4. Deleta em cascata: arena_entries, game_history, race_registrations, race_results, referrals, invite_codes, user_roles, profiles
5. Deleta o jogador principal

**Validação**: Não pode deletar `master_admin`.

---

## 15. `admin_cancel_invite_code`

**Propósito**: Master admin cancela qualquer invite code.

**Parâmetros**: `p_code_id`

**Ação**: Se usado, limpa referral. Deleta invite_code.

---

## Mapeamento para Laravel

| RPC | Laravel Service/Method |
|-----|----------------------|
| `register_player` | `RegisterPlayerService::execute()` |
| `validate_invite_code` | `InviteCodeService::validate()` |
| `generate_invite_code` | `InviteCodeService::generate()` |
| `share_invite_code` | `InviteCodeService::share()` |
| `cancel_invite_code` | `InviteCodeService::cancel()` |
| `choose_generation_color` | `GenerationColorService::choose()` |
| `update_player_energy` | `EnergyService::update()` |
| `update_skema_box` | `SkemaBoxService::credit()` |
| `update_bot_treasury` | `BotTreasuryService::update()` |
| `has_role` | `Gate::define('has-role', ...)` |
| `set_user_role_and_tier` | `AdminService::setRoleAndTier()` |
| `admin_adjust_player_energy` | `AdminService::adjustEnergy()` |
| `admin_set_player_status` | `AdminService::setStatus()` |
| `admin_delete_player` | `AdminService::deletePlayer()` |
| `admin_cancel_invite_code` | `AdminService::cancelInvite()` |
