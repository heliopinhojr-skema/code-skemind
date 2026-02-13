# 10 — Transferências de Energia (P2P)

## Visão Geral

Transferências P2P permitem que jogadores de tier **Grão Mestre e acima** enviem energia para outros jogadores, com uma taxa de 6,43% para o Skema Box.

## Restrições

| Regra | Descrição |
|-------|-----------|
| Tier mínimo | Grão Mestre (`Grão Mestre`, `Criador`, `master_admin`) |
| Auto-transferência | ❌ Proibido |
| Conta bloqueada (remetente) | ❌ Proibido |
| Conta bloqueada (destinatário) | ❌ Proibido |
| Valor mínimo | k$ 0,01 |
| Precisão | 2 casas decimais |

## Taxa

```
TRANSFER_TAX = 6,43%
taxa = valor × 0.0643
total_debitado = valor + taxa
```

### Exemplo

Transferência de k$ 100,00:
- Taxa: k$ 6,43
- Total debitado do remetente: k$ 106,43
- Creditado ao destinatário: k$ 100,00
- Creditado ao Skema Box: k$ 6,43

## Validação de Saldo Disponível

O saldo **bloqueado** para convites futuros NÃO pode ser usado para transferências:

```
saldo_disponivel = saldo_total - saldo_bloqueado
saldo_bloqueado = (slots_restantes × custo_por_convite) + base_bloqueada
```

A Edge Function replica a lógica do `tierEconomy.ts` para calcular o saldo disponível no servidor.

## Fluxo Completo

```
1. Valida JWT
2. Busca profile do remetente
3. Verifica status != 'blocked'
4. Verifica tier >= Grão Mestre
5. Busca destinatário por nickname (case-insensitive com ilike)
6. Verifica não é auto-transferência
7. Verifica destinatário não bloqueado
8. Conta invites enviados (referrals)
9. Calcula saldo disponível (exclui bloqueado)
10. Calcula taxa em centavos
11. Verifica saldo_disponivel >= valor + taxa
12. ATOMICAMENTE:
    a. Debita remetente: -(valor + taxa)
    b. Credita destinatário: +valor
    c. Credita Skema Box: +taxa (via RPC update_skema_box)
13. Log e retorno
```

## Rollback

- Se step (b) falha → reverte step (a) restaurando saldo original
- Step (c) é "não-crítico" — se falhar, logga mas não reverte (a taxa pode ser reconciliada)

## Payload e Resposta

**Request:**
```json
{
  "recipientNickname": "PlayerName",
  "amount": 100.00
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "transferred": 100.00,
  "tax": 6.43,
  "totalDebited": 106.43,
  "recipientName": "PlayerName",
  "senderNewBalance": 893.57
}
```

## Implementação Laravel

```php
// app/Services/TransferService.php

class TransferService
{
    const TAX_RATE = 0.0643;

    public function transfer(Profile $sender, string $recipientNickname, float $amount): array
    {
        return DB::transaction(function () use ($sender, $recipientNickname, $amount) {
            // Validações
            $this->assertNotBlocked($sender);
            $this->assertMinTier($sender, ['master_admin', 'Criador', 'Grão Mestre']);
            
            $recipient = Profile::whereRaw('LOWER(name) = ?', [strtolower($recipientNickname)])->firstOrFail();
            $this->assertNotSelf($sender, $recipient);
            $this->assertNotBlocked($recipient);

            // Calcular saldo disponível
            $breakdown = app(TierEconomyService::class)->calculateBalanceBreakdown(
                $sender->energy, $sender->player_tier, $sender->referrals()->count()
            );

            $taxCents = (int) round($amount * 100 * self::TAX_RATE);
            $totalCostCents = (int) round($amount * 100) + $taxCents;
            
            if ($breakdown['available'] * 100 < $totalCostCents) {
                throw new InsufficientBalanceException();
            }

            // Executar transferência
            $sender->decrement('energy', $totalCostCents / 100);
            $recipient->increment('energy', $amount);
            
            app(SkemaBoxService::class)->credit(
                $taxCents / 100, 'transfer_tax',
                "Taxa transf. {$sender->name} → {$recipient->name}: k$ " . number_format($amount, 2)
            );

            return ['transferred' => $amount, 'tax' => $taxCents / 100];
        });
    }
}
```
