# 14 — Mapeamento de Endpoints REST (Laravel)

## Autenticação

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/auth/login` | Login (nickname + PIN) | ❌ |
| POST | `/api/auth/register` | Registro (convite + nickname + PIN) | ❌ |
| POST | `/api/auth/logout` | Logout (invalidar token) | ✅ |

### Login Request
```json
{ "nickname": "PlayerName", "pin": "1234" }
```

### Register Request
```json
{ "nickname": "PlayerName", "pin": "1234", "invite_code": "SKINV1A2B3C" }
```

---

## Perfil

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/profile` | Perfil do usuário logado | ✅ |
| PUT | `/api/profile` | Atualizar perfil (emoji, mood) | ✅ |
| GET | `/api/profile/balance` | Breakdown de saldo (total, locked, available) | ✅ |
| POST | `/api/profile/accept-terms` | Aceitar termos | ✅ |
| GET | `/api/profiles` | Listar todos (nome, tier, status) | ✅ (auth) |
| GET | `/api/profiles/:id` | Perfil público de outro jogador | ✅ (auth) |

---

## Convites

| Método | Endpoint | Descrição | Auth | Role |
|--------|----------|-----------|------|------|
| GET | `/api/invites` | Listar convites do jogador | ✅ | — |
| POST | `/api/invites/generate` | Gerar novo código DNA | ✅ | — |
| POST | `/api/invites/:id/share` | Marcar como compartilhado | ✅ | — |
| DELETE | `/api/invites/:id` | Cancelar convite não usado | ✅ | — |
| POST | `/api/invites/validate` | Validar código (público, pré-registro) | ❌ | — |

### Generate Response
```json
{ "code": "SKINV1A2B3C", "id": "uuid" }
```

### Validate Request/Response
```json
// Request
{ "code": "SKINV1A2B3C" }

// Response
{ "valid": true, "inviter_name": "Creator1", "inviter_tier": "Criador" }
```

---

## Arenas

| Método | Endpoint | Descrição | Auth | Role |
|--------|----------|-----------|------|------|
| GET | `/api/arenas` | Listar arenas ativas | ❌ | — |
| POST | `/api/arenas` | Criar arena | ✅ | guardiao+ |
| PUT | `/api/arenas/:id` | Editar arena | ✅ | guardiao+ |
| DELETE | `/api/arenas/:id` | Deletar arena | ✅ | guardiao+ |
| POST | `/api/arenas/enter` | Entrar na arena (debita energy) | ✅ | — |
| POST | `/api/arenas/finish` | Finalizar arena (credita prêmios) | ✅ | — |

### Enter Request
```json
{ "buy_in": 0.55, "rake_fee": 0.05, "bot_count": 99, "arena_id": "uuid" }
```

### Finish Request
```json
{
  "player_rank": 3, "player_prize": 5.00, "bot_prizes_total": 42.50,
  "attempts": 5, "score": 1300, "time_remaining": 95.5, "won": true,
  "arena_buy_in": 0.55, "arena_pool": 50.00
}
```

---

## Corridas Oficiais

| Método | Endpoint | Descrição | Auth | Role |
|--------|----------|-----------|------|------|
| GET | `/api/races` | Listar corridas | ❌ | — |
| GET | `/api/races/:id` | Detalhes da corrida | ❌ | — |
| POST | `/api/races/:id/register` | Inscrever-se (debita fee) | ✅ | — |
| DELETE | `/api/races/:id/register` | Cancelar inscrição (estorna) | ✅ | — |
| POST | `/api/races/:id/submit` | Submeter resultado | ✅ | — |
| GET | `/api/races/:id/leaderboard` | Ranking da corrida | ✅ | — |

### Submit Request
```json
{
  "won": true, "attempts": 4, "score": 1500,
  "time_remaining": 120.5,
  "guesses": [{ "guess": ["circle","square","triangle","diamond"], "feedback": {"exact":2,"partial":1} }]
}
```

---

## Transferências

| Método | Endpoint | Descrição | Auth | Role |
|--------|----------|-----------|------|------|
| POST | `/api/transfers` | Transferir energia P2P | ✅ | grao_mestre+ |

### Request
```json
{ "recipientNickname": "PlayerName", "amount": 100.00 }
```

### Response
```json
{
  "success": true, "transferred": 100.00, "tax": 6.43,
  "totalDebited": 106.43, "recipientName": "PlayerName"
}
```

---

## Game History

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/game-history` | Histórico do jogador logado | ✅ |
| GET | `/api/game-history?mode=arena` | Filtrar por modo | ✅ |

---

## Investidor

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/investor-interest` | Registrar interesse | ✅ |
| DELETE | `/api/investor-interest` | Remover interesse | ✅ |

---

## Admin (Guardian)

Todas protegidas por `role:master_admin` ou `role:master_admin,guardiao`.

| Método | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/admin/dashboard` | Métricas do sistema | guardiao+ |
| GET | `/api/admin/players` | Todos os jogadores | guardiao+ |
| GET | `/api/admin/players/:id` | Detalhes do jogador | guardiao+ |
| POST | `/api/admin/players/:id/adjust-energy` | Ajustar saldo | master_admin |
| POST | `/api/admin/players/:id/set-status` | Bloquear/desbloquear | master_admin |
| DELETE | `/api/admin/players/:id` | Deletar jogador + descendentes | master_admin |
| POST | `/api/admin/players/:id/set-role` | Alterar role e tier | master_admin |
| GET | `/api/admin/referrals` | Árvore de referrals | guardiao+ |
| GET | `/api/admin/skema-box` | Saldo + transações | guardiao+ |
| GET | `/api/admin/bot-treasury` | Saldo do bot treasury | guardiao+ |
| POST | `/api/admin/bot-treasury/donate` | Doar HX → bots | master_admin |
| GET | `/api/admin/investor-interest` | Lista de interessados | guardiao+ |
| POST | `/api/admin/races` | Criar corrida | master_admin |
| PUT | `/api/admin/races/:id` | Editar corrida | master_admin |
| POST | `/api/admin/races/:id/start` | Iniciar corrida | master_admin |
| POST | `/api/admin/races/:id/finish` | Finalizar corrida | master_admin |
| POST | `/api/admin/arenas` | Criar arena | guardiao+ |
| PUT | `/api/admin/arenas/:id` | Editar arena | guardiao+ |
| DELETE | `/api/admin/arenas/:id` | Deletar arena | guardiao+ |
| DELETE | `/api/admin/invite-codes/:id` | Cancelar convite (admin) | master_admin |

### Dashboard Response
```json
{
  "totalPlayers": 150,
  "totalEnergy": 450000.00,
  "hxEnergy": 8500000.00,
  "playersEnergy": 450000.00,
  "skemaBoxBalance": 35000.00,
  "botTreasuryBalance": 15000.00,
  "systemTotal": 10000000.00,
  "totalReferrals": 145,
  "creditedReferrals": 140,
  "totalDistributed": 1500000.00,
  "totalRaces": 25
}
```

---

## Edge Functions → Laravel Controllers

| Edge Function | Laravel Equivalente |
|---------------|---------------------|
| `process-arena-economy` | `ArenaEconomyController` (enter/finish) |
| `submit-race-result` | `RaceResultController::submit()` |
| `transfer-energy` | `TransferController::transfer()` |
| `process-referral-rewards` | `ReferralRewardService` (job/queue) |

---

## Autenticação via Sanctum

```php
// Todas as rotas protegidas
Route::middleware('auth:sanctum')->group(function () {
    // Rotas do jogador...
    
    Route::middleware('role:master_admin,guardiao')->prefix('admin')->group(function () {
        // Rotas administrativas...
    });
});

// Rotas públicas
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::get('/arenas', [ArenaController::class, 'index']);
Route::get('/races', [RaceController::class, 'index']);
Route::post('/invites/validate', [InviteController::class, 'validate']);
```
