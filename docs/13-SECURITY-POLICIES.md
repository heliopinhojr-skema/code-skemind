# 13 — Políticas de Segurança

## Visão Geral

As políticas RLS (Row Level Security) do Supabase devem ser traduzidas para **Middleware**, **Gates** e **Policies** no Laravel.

## Função Base: `has_role`

```sql
-- Supabase (SECURITY DEFINER para evitar recursão RLS)
CREATE FUNCTION has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$ LANGUAGE sql SECURITY DEFINER;
```

### Laravel Equivalente

```php
// app/Providers/AuthServiceProvider.php
Gate::define('has-role', function (User $user, string $role) {
    return $user->roles()->where('role', $role)->exists();
});

// Middleware
class CheckRole {
    public function handle($request, Closure $next, ...$roles) {
        if (!$request->user()->roles()->whereIn('role', $roles)->exists()) {
            abort(403);
        }
        return $next($request);
    }
}
```

---

## Políticas por Tabela

### `profiles`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Qualquer autenticado | Middleware `auth` |
| INSERT | Apenas próprio `user_id` | Controller valida `$request->user()->id` |
| UPDATE | Apenas próprio `user_id` | Policy: `$user->id === $profile->user_id` |
| DELETE | ❌ Ninguém (exceto admin via RPC) | Sem rota pública de DELETE |

> ⚠️ PIN visível apenas ao dono: no SELECT do frontend, filtrar `pin` se não for o próprio perfil.

### `user_roles`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Próprio `user_id` | Policy: `$user->id === $userRole->user_id` |
| ALL (CRUD) | Apenas `master_admin` | Middleware `role:master_admin` |

### `invite_codes`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Próprio creator_id OU master_admin/guardiao | Policy |
| INSERT | Qualquer autenticado | Via Service (generate_invite_code) |
| UPDATE | Apenas `master_admin` | Via Service (share/cancel) |
| DELETE | ❌ (via RPC cancel) | Via Service |

### `referrals`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Próprio inviter/invited OU master_admin/guardiao | Policy |
| INSERT | Qualquer autenticado | Via Service (register_player) |
| UPDATE | Apenas `master_admin` | Via Service |
| DELETE | ❌ | Sem rota |

### `arena_listings`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Público (true) | Sem auth necessário |
| INSERT | master_admin, guardiao, grao_mestre | Middleware `role:master_admin,guardiao,grao_mestre` |
| UPDATE | master_admin, guardiao, grao_mestre | Middleware |
| DELETE | master_admin, guardiao, grao_mestre | Middleware |

### `arena_entries`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Próprio player_id OU master_admin/guardiao | Policy |
| INSERT | Qualquer autenticado | Via Edge Function (process-arena-economy) |
| UPDATE | Qualquer autenticado | Via Edge Function |
| DELETE | master_admin, guardiao, grao_mestre | Middleware |

### `game_history`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Próprio player_id OU master_admin/guardiao | Policy |
| INSERT | Qualquer autenticado | Via Service |
| UPDATE | ❌ | Sem rota |
| DELETE | ❌ | Sem rota |

### `official_races`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Público (true) | Sem auth |
| ALL | Apenas `master_admin` | Middleware `role:master_admin` |

### `race_registrations`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Próprio player_id OU master_admin/guardiao | Policy |
| INSERT | Qualquer autenticado | Via Controller |
| DELETE | Próprio player_id | Policy |
| UPDATE | ❌ | Sem rota |

### `race_results`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Próprio player_id OU master_admin/guardiao | Policy |
| INSERT | Qualquer autenticado | Via Edge Function |
| UPDATE | ❌ | Sem rota |
| DELETE | ❌ | Sem rota |

### `skema_box`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Público | Sem auth |
| UPDATE | Apenas `master_admin` | Via Service |
| INSERT/DELETE | ❌ | Sem rota (singleton) |

### `skema_box_transactions`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | master_admin, guardiao | Middleware `role:master_admin,guardiao` |
| INSERT | Qualquer autenticado | Via Service (interno) |
| UPDATE/DELETE | ❌ | Sem rota |

### `bot_treasury`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Público | Sem auth |
| UPDATE | Apenas `master_admin` | Via Service |
| INSERT/DELETE | ❌ | Sem rota (singleton) |

### `investor_interest`

| Operação | Regra RLS | Laravel |
|----------|-----------|---------|
| SELECT | Qualquer autenticado | Middleware `auth` |
| INSERT | Próprio player_id | Policy |
| DELETE | Próprio player_id | Policy |
| UPDATE | ❌ | Sem rota |

---

## Resumo de Middleware Laravel

| Middleware | Roles | Rotas |
|------------|-------|-------|
| `auth:sanctum` | Todos autenticados | Maioria das rotas |
| `role:master_admin` | Apenas HX | Admin CRUD, ajustes, deleções |
| `role:master_admin,guardiao` | HX + Criadores | Dashboard admin, visualizar todos |
| `role:master_admin,guardiao,grao_mestre` | HX + Criadores + GM | Criar/gerenciar arenas |

## Princípio de Segurança

**NUNCA** verificar role no frontend. Toda verificação deve ser server-side via:
- Middleware (antes de chegar ao controller)
- Policy (autorização por recurso)
- Gate (verificação pontual)
