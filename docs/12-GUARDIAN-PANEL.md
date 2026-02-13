# 12 — Painel Administrativo (Guardian)

## Visão Geral

O painel Guardian é acessível apenas para usuários com role `master_admin` ou `guardiao`. Oferece visibilidade total do sistema com ferramentas de gestão.

## Acesso

- Rota: `/guardian`
- Proteção: `ProtectedRoute` verifica role via `user_roles`
- Tabs: Dashboard, Jogadores, Arenas, Corridas, Referrals, Skema Box

## Dashboard

### Auditoria de Soma Zero

Exibe em tempo real os 4 pilares:

```
┌──────────┬──────────┬──────────┬──────────┬──────────────┐
│ HX       │ Jogadores│ Bot      │ Skema    │ ∑ Total      │
│ (Tesouro)│ (todos)  │ Treasury │ Box      │ Sistema      │
│ k$ X     │ k$ Y     │ k$ Z     │ k$ W     │ k$ 10M       │
└──────────┴──────────┴──────────┴──────────┴──────────────┘
                                              delta vs 10M
```

Se delta ≠ 0, exibe alerta de reconciliação.

### Métricas em Cards Clicáveis

| Card | Valor | Navega para |
|------|-------|-------------|
| Jogadores | Total de profiles | Tab: Jogadores |
| Energia Circulando | Soma de energy (com locked/available) | Tab: Jogadores |
| Skema Box | Saldo do Skema Box | Tab: Skema Box |
| Convites | Total de referrals | Tab: Referrals |
| Distribuído | Soma de reward_amount creditados | Tab: Referrals |
| Corridas | Total de corridas | Tab: Corridas |

### Jogadores Online

- Monitora via Supabase Realtime (presence channel: `skema-lobby`)
- Exibe lista de jogadores online com nome, emoji e status

### Crescimento

- Novos jogadores hoje (baseado em `created_at` do dia)
- Últimos 5 registros com nome, emoji, tier e hora

### Bot Treasury

- Saldo total e por bot
- Botão "Doar" para HX transferir para o fundo
- Alertas:
  - < k$ 50.000 → alerta vermelho
  - > k$ 110.000 → meta atingida (verde)

### Códigos DNA do Guardian

- Lista de invite_codes gerados pelo Guardian
- Copiar código ou link de convite
- Status: disponível / compartilhado / aceito

### Interesse em Investir

- Lista de jogadores que registraram interesse
- Nome e data

### Cores de Geração

- Visual de quais cores foram escolhidas e por quais Criadores
- Grid colorido com "planetas" (faces)

## Tab: Jogadores (`GuardianUsersTable`)

### Tabela com Todas as Informações

| Coluna | Descrição |
|--------|-----------|
| Nome | Nickname + emoji |
| Tier | Tier atual |
| Energia | Saldo (total, bloqueado, disponível) |
| Convites | Enviados / Máximo |
| Status | active / blocked |
| Criado em | Data de registro |

### Ações por Jogador

| Ação | Descrição | Quem pode |
|------|-----------|-----------|
| Ajustar Saldo | Define novo valor de energy | master_admin |
| Bloquear/Desbloquear | Altera status | master_admin |
| Deletar | Remove jogador e descendentes | master_admin |
| Ver Detalhes | Drawer com histórico completo | master_admin, guardiao |

### Player Detail Drawer

- Informações completas do perfil
- Histórico de partidas (game_history)
- Árvore de referrals
- Códigos de convite gerados

## Tab: Arenas (`GuardianArenasPanel`)

### Gestão de Arenas

| Ação | Descrição |
|------|-----------|
| Criar Arena | Nome, buy-in, bots, IQ range |
| Editar | Alterar configurações |
| Fechar | Mudar status para 'closed' |
| Deletar | Remover arena |

## Tab: Corridas (`GuardianRacesPanel`)

### Gestão de Corridas Oficiais

| Ação | Descrição |
|------|-----------|
| Criar Corrida | Nome, data, taxa, prêmio |
| Iniciar | Mudar status para 'playing' |
| Finalizar | Mudar status para 'finished' |
| Ver Inscritos | Lista de registrations |
| Ver Resultados | Leaderboard com scores |

## Tab: Referrals (`GuardianReferralTree`)

- Árvore visual de quem convidou quem
- Filtro por Criador
- Exibe energia transferida
- Histórico por dia

## Tab: Skema Box

- Saldo atual
- Log de transações com filtros
- Tipo, valor, saldo após, descrição, data

## Implementação Laravel

```php
// Middleware
Route::middleware(['auth:sanctum', 'role:master_admin,guardiao'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        Route::get('/players', [AdminPlayersController::class, 'index']);
        Route::post('/players/{id}/adjust-energy', [AdminPlayersController::class, 'adjustEnergy']);
        Route::post('/players/{id}/set-status', [AdminPlayersController::class, 'setStatus']);
        Route::delete('/players/{id}', [AdminPlayersController::class, 'destroy']);
        
        Route::resource('arenas', AdminArenaController::class);
        Route::resource('races', AdminRaceController::class);
        
        Route::get('/referrals', [AdminReferralController::class, 'tree']);
        Route::get('/skema-box', [AdminSkemaBoxController::class, 'index']);
    });
```
