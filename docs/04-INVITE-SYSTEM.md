# 04 — Sistema de Convites DNA

## Visão Geral

O sistema de convites é a espinha dorsal da expansão do SKEMA. Cada jogador pode gerar códigos únicos ("DNA") para convidar novos jogadores. O custo é debitado do saldo do convidador **apenas quando o convidado completa o registro**.

## Tipos de Códigos

### 1. Códigos Master (hardcoded)

| Código | Ilimitado | Tier Criado |
|--------|-----------|-------------|
| `SKEMA1` | ✅ | Criador |
| `SKEMA2024` | ✅ | Criador |
| `PRIMEIROSJOGADORES` | ✅ | Criador |
| `BETATESTER` | ✅ | Criador |
| `DEUSPAI` | ✅ | Criador |

### 2. Códigos DNA (SKINV)

- Prefixo: `SKINV` + 6 caracteres alfanuméricos uppercase
- Gerados via RPC `generate_invite_code`
- Uso único: cada código só pode ser usado uma vez
- Vinculado ao criador (`creator_id`)

### 3. Códigos Legados (SK)

- Prefixo: `SK` + 6 caracteres
- São os `invite_code` pessoais de cada profile
- Funcionam como convite direto do jogador

## Ciclo de Vida

```
┌─────────┐     ┌──────────┐     ┌─────────┐
│ Gerado  │ ──→ │ Compart. │ ──→ │ Aceito  │
│         │     │(shared_at│     │(used_at, │
│         │     │ preench.)│     │used_by_id│
└────┬────┘     └──────────┘     │preenchido│
     │                           └──────────┘
     │ Cancelar
     ▼
┌─────────┐
│ Deletado│
└─────────┘
```

## Validação de Código (`validate_invite_code`)

Ordem de checagem:

1. **Master codes**: se `p_code` está na lista hardcoded → válido, inviter = 'SKEMA'
2. **SKINV codes**: busca em `invite_codes` → verifica se não foi usado
3. **Legacy SK codes**: busca em `profiles.invite_code`
4. Se nenhum match → inválido

Retorno (JSON):
```json
{
  "valid": true,
  "inviter_id": "uuid",
  "inviter_name": "PlayerName",
  "inviter_tier": "Criador",
  "inviter_is_guardian": true,
  "invite_code_id": "uuid"  // só para SKINV
}
```

## Geração de Código (`generate_invite_code`)

```sql
-- Gera SKINV + 6 chars único
LOOP
  v_code := 'SKINV' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  EXIT WHEN NOT EXISTS(SELECT 1 FROM invite_codes WHERE code = v_code);
END LOOP;

INSERT INTO invite_codes (code, creator_id) VALUES (v_code, p_creator_profile_id);
```

## Compartilhamento (`share_invite_code`)

- Marca `shared_at = now()`
- Opcionalmente registra `shared_to_name`
- Não debita nada — o débito ocorre apenas no registro do convidado

## Cancelamento (`cancel_invite_code`)

- Só pode cancelar se `used_by_id IS NULL`
- Deleta o registro de `invite_codes`
- O slot fica disponível para gerar novo código

## Links de Convite

Formato: `https://skemind-code-guess.lovable.app/auth?convite=CODE`

O parâmetro `convite` pré-preenche o campo de código na tela de registro.

## Cotas por Tier

A geração de novos códigos é limitada pelo número de convites **realizados do tier esperado**:

- Criador (HX convida): 7 vagas
- Grão Mestre (Criador convida): 10 vagas
- Mestre (Grão Mestre convida): 10 vagas
- Boom (Mestre convida): 10 vagas
- Ploft (Boom convida): 10 vagas

Convites legados ou de nível inferior não consomem os slots premium.

## Implementação Laravel

```php
// app/Services/InviteCodeService.php

class InviteCodeService
{
    const MASTER_CODES = ['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];

    public function validate(string $code): array
    {
        $code = strtoupper(trim($code));

        // 1. Master codes
        if (in_array($code, self::MASTER_CODES)) {
            return ['valid' => true, 'inviter_name' => 'SKEMA', 'inviter_tier' => 'master_admin'];
        }

        // 2. SKINV codes
        $invite = InviteCode::where('code', $code)->first();
        if ($invite) {
            if ($invite->used_by_id) return ['valid' => false, 'reason' => 'code_already_used'];
            $inviter = Profile::find($invite->creator_id);
            return ['valid' => true, 'inviter_id' => $inviter->id, ...];
        }

        // 3. Legacy SK codes
        $inviter = Profile::where('invite_code', $code)->first();
        if ($inviter) return ['valid' => true, 'inviter_id' => $inviter->id, ...];

        return ['valid' => false];
    }

    public function generate(string $creatorProfileId): string
    {
        do {
            $code = 'SKINV' . strtoupper(Str::random(6));
        } while (InviteCode::where('code', $code)->exists());

        InviteCode::create(['code' => $code, 'creator_id' => $creatorProfileId]);
        return $code;
    }
}
```
