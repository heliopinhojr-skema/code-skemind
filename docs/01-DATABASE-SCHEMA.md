# 01 — Database Schema

## Enum: `app_role`

```sql
CREATE TYPE public.app_role AS ENUM (
  'master_admin',  -- HX / Administrador supremo
  'guardiao',      -- Criador (Guardian)
  'grao_mestre',   -- Grão Mestre
  'mestre',        -- Mestre
  'jogador'        -- Boom, Ploft e jogadores base
);
```

> Em Laravel: usar constantes ou Enum PHP nativo (PHP 8.1+).

---

## Tabelas

### 1. `profiles`

Perfil principal do jogador. **Não armazena roles** (estão em `user_roles`).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `user_id` | UUID | No | — | FK para auth.users (Laravel: `users.id`) |
| `name` | TEXT | No | — | Nickname único (case-insensitive) |
| `emoji` | TEXT | No | `'🎮'` | Avatar emoji |
| `pin` | TEXT | Yes | — | PIN de 4 dígitos (visível apenas ao dono) |
| `energy` | NUMERIC | No | `10` | Saldo em k$ |
| `invite_code` | TEXT | No | — | Código de convite pessoal (SK + 6 chars) |
| `invited_by` | TEXT | Yes | — | Código do convite usado no registro |
| `invited_by_name` | TEXT | Yes | — | Nome de quem convidou |
| `player_tier` | TEXT | Yes | `'jogador'` | Tier: master_admin, Criador, Grão Mestre, Mestre, Boom, Ploft |
| `generation_color` | TEXT | Yes | — | Cor da geração (apenas Criadores escolhem, propaga para descendentes) |
| `status` | TEXT | No | `'active'` | active, blocked, penalized |
| `mood` | TEXT | No | `'happy'` | Estado emocional do avatar |
| `stats_races` | INTEGER | No | `0` | Total de partidas jogadas |
| `stats_wins` | INTEGER | No | `0` | Total de vitórias |
| `stats_best_time` | NUMERIC | Yes | `0` | Melhor tempo restante |
| `terms_accepted_at` | TIMESTAMPTZ | Yes | — | Quando aceitou os termos |
| `last_refill_date` | TEXT | Yes | `to_char(now(), 'YYYY-MM-DD')` | Data do último refill |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data de criação |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Última atualização |

**Índices sugeridos**: `UNIQUE(name)`, `UNIQUE(user_id)`, `UNIQUE(invite_code)`, `INDEX(invited_by)`, `INDEX(player_tier)`

---

### 2. `user_roles`

Tabela separada de roles para evitar escalação de privilégios.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `user_id` | UUID | No | — | FK para auth.users |
| `role` | app_role | No | — | Role do usuário |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data de atribuição |

**Constraint**: `UNIQUE(user_id, role)`

> Em Laravel: tabela `user_roles` com Gate `has_role($userId, $role)`.

---

### 3. `invite_codes`

Códigos DNA de convite (prefixo `SKINV`).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `code` | TEXT | No | — | Código único (ex: SKINV1A2B3C) |
| `creator_id` | UUID | No | — | FK → profiles.id |
| `shared_at` | TIMESTAMPTZ | Yes | — | Quando foi compartilhado |
| `shared_to_name` | TEXT | Yes | — | Nome do destinatário (informativo) |
| `used_by_id` | UUID | Yes | — | FK → profiles.id (quem usou) |
| `used_at` | TIMESTAMPTZ | Yes | — | Quando foi utilizado |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data de criação |

**Índices**: `UNIQUE(code)`, `INDEX(creator_id)`, `INDEX(used_by_id)`

---

### 4. `referrals`

Registro de convites realizados (quem convidou quem).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `inviter_id` | UUID | No | — | FK → profiles.id |
| `invited_id` | UUID | No | — | FK → profiles.id (UNIQUE) |
| `reward_amount` | NUMERIC | Yes | `10` | Valor transferido |
| `reward_credited` | BOOLEAN | No | `false` | Se já foi creditado |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data do convite |

**Constraint**: `UNIQUE(invited_id)` — cada jogador só pode ser convidado uma vez.

---

### 5. `arena_listings`

Configuração de arenas customizáveis.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `name` | TEXT | No | — | Nome da arena |
| `creator_id` | UUID | No | — | FK → profiles.id |
| `buy_in` | NUMERIC | No | `0.55` | Valor de entrada (k$) |
| `rake_fee` | NUMERIC | No | `0.05` | Taxa de rake (k$) |
| `bot_count` | INTEGER | No | `99` | Quantidade de bots |
| `iq_min` | INTEGER | No | `80` | IQ mínimo dos bots |
| `iq_max` | INTEGER | No | `110` | IQ máximo dos bots |
| `difficulty` | TEXT | No | `'MEDIO'` | Dificuldade |
| `max_entries` | INTEGER | No | `0` | Máximo de entradas |
| `total_entries` | INTEGER | No | `0` | Entradas realizadas |
| `status` | TEXT | No | `'open'` | open, closed |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data de criação |

---

### 6. `arena_entries`

Entradas de jogadores em arenas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `arena_id` | UUID | No | — | FK → arena_listings.id |
| `player_id` | UUID | No | — | FK → profiles.id |
| `status` | TEXT | No | `'playing'` | playing, completed, abandoned |
| `score` | NUMERIC | No | `0` | Pontuação |
| `attempts` | INTEGER | No | `0` | Tentativas |
| `time_remaining` | NUMERIC | Yes | — | Tempo restante (segundos) |
| `prize_won` | NUMERIC | No | `0` | Prêmio conquistado |
| `rank` | INTEGER | Yes | — | Posição final |
| `completed_at` | TIMESTAMPTZ | Yes | — | Quando completou |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data de entrada |

---

### 7. `game_history`

Histórico de todas as partidas (solo, arena, corrida).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `player_id` | UUID | No | — | FK → profiles.id |
| `game_mode` | TEXT | No | `'solo'` | solo, arena, official |
| `race_id` | UUID | Yes | — | FK → official_races.id |
| `won` | BOOLEAN | No | `false` | Se venceu |
| `attempts` | INTEGER | No | `0` | Tentativas |
| `score` | NUMERIC | No | `0` | Pontuação |
| `time_remaining` | NUMERIC | Yes | — | Tempo restante |
| `rank` | INTEGER | Yes | — | Posição (arenas) |
| `prize_won` | NUMERIC | Yes | `0` | Prêmio (arenas) |
| `arena_buy_in` | NUMERIC | Yes | — | Buy-in da arena |
| `arena_pool` | NUMERIC | Yes | — | Pool total da arena |
| `secret_code` | JSONB | Yes | — | Código secreto |
| `guesses` | JSONB | Yes | — | Histórico de palpites |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data da partida |

---

### 8. `official_races`

Corridas oficiais agendadas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `name` | TEXT | No | — | Nome da corrida |
| `scheduled_date` | TIMESTAMPTZ | No | — | Data agendada |
| `status` | TEXT | No | `'registration'` | registration, playing, finished |
| `entry_fee` | NUMERIC | No | `1.10` | Taxa de inscrição (k$) |
| `prize_per_player` | NUMERIC | No | `1.00` | Prêmio por jogador |
| `skema_box_fee` | NUMERIC | No | `0.10` | Taxa para o Skema Box |
| `min_players` | INTEGER | No | `2` | Mínimo para iniciar |
| `max_players` | INTEGER | No | `16` | Máximo de participantes |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data de criação |

---

### 9. `race_registrations`

Inscrições em corridas oficiais.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `race_id` | UUID | No | — | FK → official_races.id |
| `player_id` | UUID | No | — | FK → profiles.id |
| `registered_at` | TIMESTAMPTZ | No | `now()` | Data de inscrição |

---

### 10. `race_results`

Resultados de corridas oficiais.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `race_id` | UUID | No | — | FK → official_races.id |
| `player_id` | UUID | No | — | FK → profiles.id |
| `status` | TEXT | No | `'pending'` | pending, completed, failed |
| `attempts` | INTEGER | No | `0` | Tentativas |
| `score` | NUMERIC | No | `0` | Pontuação (server-side) |
| `time_remaining` | NUMERIC | Yes | — | Tempo restante |
| `completed_at` | TIMESTAMPTZ | Yes | — | Quando completou |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data do resultado |

---

### 11. `skema_box`

Tesouro global (singleton row).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `'00000000-0000-0000-0000-000000000001'` | PK fixo |
| `balance` | NUMERIC | No | `0` | Saldo acumulado |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Última atualização |

---

### 12. `skema_box_transactions`

Log de transações do Skema Box.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `type` | TEXT | No | — | arena_rake, official_rake, transfer_tax, etc. |
| `amount` | NUMERIC | No | — | Valor (positivo = crédito) |
| `balance_after` | NUMERIC | No | `0` | Saldo após operação |
| `description` | TEXT | Yes | — | Descrição da transação |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data da transação |

---

### 13. `bot_treasury`

Fundo dos bots (singleton row).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `'00000000-0000-0000-0000-000000000002'` | PK fixo |
| `bot_count` | INTEGER | No | `99` | Quantidade de bots no sistema |
| `balance` | NUMERIC | No | `0` | Saldo total do fundo |
| `balance_per_bot` | NUMERIC | No | `150` | Saldo por bot |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Última atualização |

---

### 14. `investor_interest`

Registro de interesse em investir.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `player_id` | UUID | No | — | FK → profiles.id (UNIQUE) |
| `player_name` | TEXT | No | — | Nome do jogador |
| `created_at` | TIMESTAMPTZ | No | `now()` | Data do registro |

---

## Diagrama de Relacionamentos

```
profiles (1) ──── (N) invite_codes     [creator_id]
profiles (1) ──── (N) referrals        [inviter_id]
profiles (1) ──── (1) referrals        [invited_id] UNIQUE
profiles (1) ──── (N) arena_entries    [player_id]
profiles (1) ──── (N) game_history     [player_id]
profiles (1) ──── (N) race_registrations [player_id]
profiles (1) ──── (N) race_results     [player_id]
profiles (1) ──── (1) investor_interest [player_id] UNIQUE

arena_listings (1) ── (N) arena_entries [arena_id]
official_races (1) ── (N) race_registrations [race_id]
official_races (1) ── (N) race_results [race_id]
official_races (1) ── (N) game_history [race_id]

users (auth) (1) ── (1) profiles       [user_id]
users (auth) (1) ── (N) user_roles     [user_id]
```
