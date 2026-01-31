

# Plano: Corrigir Inconsistência na Busca do Inviter

## Problema Identificado

A função `register_player` não encontra o inviter mesmo quando o código é válido. Os logs do Postgres confirmam:

```
[register_player] No inviter found for code: SKB816A5
```

Porém, quando executo a mesma query diretamente no banco, ela **funciona perfeitamente** e retorna o Gabriel.

### Causa Raiz

Há uma **inconsistência** entre as duas funções SQL:

| Função | Query de Busca |
|--------|----------------|
| `validate_invite_code` | `WHERE invite_code = v_upper_code` |
| `register_player` | `WHERE UPPER(TRIM(invite_code)) = v_input_code` |

A função `validate_invite_code` encontra o inviter porque compara diretamente. A função `register_player` deveria encontrar também, mas por alguma razão (possível problema de transação ou versão da função), está falhando.

---

## Solução

Harmonizar a lógica de busca para que `register_player` use **exatamente** o mesmo padrão de query que `validate_invite_code`:

```sql
-- De (atual - inconsistente):
SELECT * INTO v_inviter
FROM public.profiles
WHERE UPPER(TRIM(invite_code)) = v_input_code;

-- Para (corrigido - consistente com validate_invite_code):
SELECT * INTO v_inviter
FROM public.profiles
WHERE invite_code = v_input_code;
```

Isso garante que ambas as funções busquem o inviter da mesma forma exata.

---

## Detalhes Técnicos

### Migração SQL

Criar uma nova migração que atualiza a função `register_player` para usar comparação direta:

```sql
CREATE OR REPLACE FUNCTION public.register_player(...)
AS $function$
...
  -- Normalizar input (isso já está correto)
  v_input_code := UPPER(TRIM(COALESCE(p_invite_code, '')));

  -- Buscar inviter com comparação DIRETA (igual a validate_invite_code)
  SELECT * INTO v_inviter
  FROM public.profiles
  WHERE invite_code = v_input_code;
...
$function$;
```

### Por que isso funciona

1. O input já é normalizado para maiúsculas: `v_input_code := UPPER(TRIM(...))`
2. Os códigos no banco já estão em maiúsculas (ex: `SKB816A5`)
3. Comparação direta é mais eficiente e consistente

---

## Resultado Esperado

Após a correção:
1. `validate_invite_code('SKB816A5')` → encontra Gabriel ✅
2. `register_player(..., 'SKB816A5')` → encontra Gabriel ✅
3. Novo usuário recebe tier `guardiao` e energia `999999` ✅

