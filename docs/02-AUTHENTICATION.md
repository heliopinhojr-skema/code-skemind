# 02 — Autenticação

## Visão Geral

O SKEMA usa um sistema de autenticação simplificado baseado em **Nickname + PIN de 4 dígitos**. Não há email real — um email derivado é gerado internamente.

## Fluxo de Telas

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Splash     │ ──→ │  Welcome     │ ──→ │  Login /      │
│  Screen     │     │  "toque p/   │     │  Register     │
│  (1x/sessão)│     │   entrar"    │     │  (toggle)     │
└─────────────┘     └──────────────┘     └───────────────┘
```

## Login

1. Usuário digita **Nickname** e **PIN** (4 dígitos, input OTP)
2. Sistema monta email derivado: `nickname@skema.game`
3. Senha: `PIN + "SK"` (ex: PIN `1234` → senha `1234SK`)
4. Tenta login com credenciais derivadas
5. Se sucesso, verifica se tem profile → redireciona ao lobby
6. Último nickname salvo no `localStorage` (key: `skema_last_nickname`)

### Função de Derivação do Email

```typescript
const makeAuthEmail = (nickname: string): string => {
  const safe = nickname.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // Remove acentos
    .replace(/[^a-z0-9]/g, '_')                        // Só alfanuméricos
    .replace(/_+/g, '_')                                // Remove underscores duplos
    .replace(/^_|_$/g, '') || 'player';                 // Trim underscores
  return `${safe}@skema.game`;
};
```

### Função de Derivação da Senha

```typescript
const makePinPassword = (pin: string): string => `${pin}SK`;
```

## Registro

1. Usuário entra com **Código de Convite** (obrigatório)
2. Sistema valida código via RPC `validate_invite_code`
3. Usuário escolhe **Nickname** (2-15 caracteres) e **PIN** (4 dígitos)
4. Cria conta auth com email derivado
5. Executa RPC `register_player` (atômico):
   - Cria profile com tier baseado no tier do convidador
   - Debita energia do convidador
   - Cria registro em `referrals`
   - Marca `invite_code` como usado (se SKINV)
   - Atribui role em `user_roles`
6. Salva PIN no profile
7. Redireciona ao lobby

## Códigos Master

Códigos que sempre funcionam (ilimitados, criam tier **Criador**):

| Código | Uso |
|--------|-----|
| `SKEMA1` | Código principal |
| `SKEMA2024` | Código legado |
| `PRIMEIROSJOGADORES` | Beta testers |
| `BETATESTER` | Beta testers |
| `DEUSPAI` | Admin |

Quando usado código master:
- Novo jogador recebe tier **Criador** e role **guardiao**
- Recebe **k$ 200.000,00** debitados da conta HX (master_admin)

## Regras Críticas

- ⚠️ **NÃO EXISTE RECUPERAÇÃO DE CONTA** — Regra de negócio intencional
- O usuário é avisado na tela de registro com banner amarelo
- É responsabilidade do jogador anotar nickname e PIN
- Não existe "esqueci minha senha", reset de PIN ou verificação de email

## Persistência

| Key (localStorage) | Valor | Propósito |
|---------------------|-------|-----------|
| `skema_last_nickname` | string | Preencher campo de nickname no login |
| `skema_splash_shown` | `'1'` (sessionStorage) | Mostrar splash apenas 1x por sessão |

## Mapeamento para Laravel

| Supabase | Laravel |
|----------|---------|
| `supabase.auth.signUp()` | `User::create()` + `Hash::make()` |
| `supabase.auth.signInWithPassword()` | `Auth::attempt()` |
| Email derivado `@skema.game` | Campo email no `users`, gerado internamente |
| RPC `register_player` | `RegisterPlayerService::execute()` (DB transaction) |
| `supabase.auth.signOut()` | `Auth::logout()` / invalidar token |
| Auto-confirm habilitado | Não precisa de verificação de email |

### Fluxo Laravel Sugerido

```php
// RegisterController
public function register(Request $request) {
    $validated = $request->validate([
        'nickname' => 'required|string|min:2|max:15|unique:profiles,name',
        'pin' => 'required|digits:4',
        'invite_code' => 'required|string|min:4',
    ]);

    DB::transaction(function () use ($validated) {
        // 1. Validar código de convite
        $inviteResult = app(InviteCodeService::class)->validate($validated['invite_code']);
        
        // 2. Criar usuário auth
        $user = User::create([
            'email' => $this->makeAuthEmail($validated['nickname']),
            'password' => Hash::make($validated['pin'] . 'SK'),
        ]);

        // 3. Criar profile + debitar convidador + criar referral
        app(RegisterPlayerService::class)->execute($user, $validated, $inviteResult);
    });
}
```
