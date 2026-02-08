

# Simplificar Auth: Convite + Nickname + PIN de 4 Digitos

## O Que Muda

O fluxo atual exige **email + senha + codigo de convite** para registro e **email + senha** para login. Isso causa muita friccao (87% bounce rate).

### Novo Fluxo de Registro

```text
1. Codigo de Convite (ja preenchido se veio pelo link)
   [VALIDAR]
        |
        v
2. Codigo valido! Convidado por Gabriel
   - Escolha seu avatar (emoji)
   - Escolha seu nickname unico
   - Crie uma senha de 4 digitos
   - "Guarde seu nickname e PIN!"
   [ENTRAR NO SKEMA]
```

### Novo Fluxo de Login (Retorno)

```text
1. Seu Nickname: [__________]
   Sua Senha:    [_ _ _ _]  (4 digitos)
   [ENTRAR]
```

### O Que Sai

- Campo de email (removido completamente)
- Senha longa (minimo 6 chars) -- substituida por PIN de 4 digitos
- Icones Mail, Lock, Eye, EyeOff (desnecessarios)

---

## Como Funciona por Baixo

### Autenticacao Supabase (Anonima + Perfil)

Como nao teremos mais email, usaremos **Supabase Anonymous Sign-In**:

1. No registro, o sistema chama `supabase.auth.signInAnonymously()` para criar uma sessao
2. O PIN de 4 digitos sera salvo no perfil do jogador (campo `pin` na tabela `profiles`)
3. O nickname sera unico (indice case-insensitive no banco)
4. No login, o sistema busca o perfil pelo nickname, valida o PIN, e cria sessao anonima vinculada

### Migracao SQL Necessaria

Tres mudancas no banco:

1. **Adicionar coluna `pin`** na tabela `profiles` (TEXT, 4 digitos)
2. **Criar indice unico** no nome (case-insensitive) para garantir nicknames unicos
3. **Criar funcao `login_by_nickname`** que valida nickname + PIN e retorna dados do perfil
4. **Criar funcao `check_nickname_available`** para verificacao em tempo real

---

## Mudancas nos Arquivos

### 1. Auth.tsx (reescrever)

**Registro - Step 1 (Credenciais):**
- Remove campo de email
- Remove campo de senha longa
- Mantem campo de codigo de convite
- Botao "Validar Codigo" fica habilitado apenas com codigo preenchido (sem depender de email/senha)

**Registro - Step 2 (Perfil):**
- Mantem seletor de emoji
- Mantem campo de nickname
- Adiciona campo de PIN com 4 slots visuais (usando input-otp ou 4 inputs individuais)
- Aviso claro: "Guarde seu nickname e PIN de 4 digitos -- voce vai precisar para voltar!"
- Mantem TierBenefitsCard

**Login:**
- Campo de nickname (texto)
- Campo de PIN (4 digitos visuais)
- Botao Entrar
- Remove email e senha

**Logica interna:**
- `handleRegister`: chama `signInAnonymously()` em vez de `signUp(email, password)`, depois chama `register_player` (que sera atualizado para aceitar PIN)
- `handleLogin`: chama RPC `login_by_nickname(nickname, pin)`, se valido faz `signInAnonymously()` e vincula ao perfil
- Remove imports de Mail, Lock, Eye, EyeOff
- Remove estados `email`, `showPassword`

### 2. Migracao SQL (nova)

```sql
-- Coluna PIN na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin TEXT;

-- Indice unico case-insensitive no nome
CREATE UNIQUE INDEX IF NOT EXISTS profiles_name_unique_ci 
  ON profiles (LOWER(TRIM(name)));

-- Funcao para verificar nickname disponivel
CREATE OR REPLACE FUNCTION public.check_nickname_available(p_nickname TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_nickname))
  );
END;
$$;

-- Funcao de login por nickname + PIN
CREATE OR REPLACE FUNCTION public.login_by_nickname(p_nickname TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile profiles;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_nickname));
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'error', 'Nickname nao encontrado');
  END IF;
  
  IF v_profile.pin IS NULL OR v_profile.pin != p_pin THEN
    RETURN jsonb_build_object('found', true, 'valid', false, 'error', 'PIN incorreto');
  END IF;
  
  RETURN jsonb_build_object(
    'found', true,
    'valid', true,
    'user_id', v_profile.user_id,
    'player_id', v_profile.id,
    'name', v_profile.name,
    'emoji', v_profile.emoji,
    'energy', v_profile.energy,
    'player_tier', v_profile.player_tier
  );
END;
$$;
```

### 3. register_player RPC (atualizar)

Adicionar parametro `p_pin` a funcao `register_player` existente para salvar o PIN junto com o perfil.

### 4. useSupabasePlayer.ts (ajustar)

- Login e register ja delegam para /auth, entao mudancas minimas
- Garantir que `signInAnonymously()` funciona com o fluxo existente de `onAuthStateChange`

### 5. ProtectedRoute.tsx

- Nenhuma mudanca necessaria (sessao anonima gera sessao valida igual)

---

## UX do PIN de 4 Digitos

O PIN sera exibido como 4 caixas separadas, estilo OTP, usando o componente `input-otp` que ja esta instalado no projeto:

```text
Crie sua senha de 4 digitos:

  [ 1 ] [ 2 ] [ 3 ] [ 4 ]

  Facil de lembrar, facil de digitar!
```

- Teclado numerico no mobile (inputMode="numeric")
- Auto-avanca para proximo slot
- Feedback visual quando completo

---

## Ordem de Implementacao

1. **Migracao SQL** -- Adicionar coluna `pin`, indice unico, funcoes RPC
2. **Atualizar register_player** -- Aceitar parametro `p_pin`
3. **Reescrever Auth.tsx** -- Novo fluxo sem email, com PIN de 4 digitos
4. **Testar fluxos** -- Registro e login com nickname + PIN

---

## Secao Tecnica

### Dependencias
- Nenhuma nova dependencia (input-otp ja instalado)

### Arquivos Criados
| Arquivo | Descricao |
|---------|-----------|
| Nova migracao SQL | Coluna pin, indice unico, funcoes RPC |

### Arquivos Modificados
| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Auth.tsx` | Reescrever: remover email/senha, adicionar nickname + PIN 4 digitos |
| `src/integrations/supabase/types.ts` | Regenerado apos migracao (novo campo pin, novas funcoes) |

### Arquivos Inalterados
| Arquivo | Motivo |
|---------|--------|
| `src/components/auth/ProtectedRoute.tsx` | Sessao anonima funciona igual |
| `src/hooks/useSupabasePlayer.ts` | Ja delega auth para /auth |
| `src/App.tsx` | Rotas permanecem iguais |

