# 08 — Economia das Arenas

## Visão Geral

A Edge Function `process-arena-economy` gerencia todas as transações econômicas de arenas de forma **atômica com rollback**.

## Ações

### `enter` — Entrada na Arena

**Fluxo:**

```
1. Valida autenticação (JWT)
2. Busca profile do jogador
3. Verifica status != 'blocked'
4. Verifica jogador tem energy >= buy_in
5. Verifica Bot Treasury tem saldo >= (bot_count × buy_in)
6. ATOMICAMENTE:
   a. Debita jogador: -buy_in
   b. Debita Bot Treasury: -(bot_count × buy_in)
   c. Credita Skema Box: +((bot_count + 1) × rake_fee)
7. Retorna novo saldo e pool total
```

**Rollback em cascata:**
- Se step (b) falha → reverte (a)
- Se step (c) falha → reverte (a) e (b)

**Payload:**
```json
{
  "action": "enter",
  "buy_in": 0.55,
  "rake_fee": 0.05,
  "bot_count": 99,
  "arena_id": "uuid (opcional)"
}
```

**Resposta:**
```json
{
  "success": true,
  "player_energy": 9.45,
  "bot_treasury_balance": 14795.55,
  "skema_box_balance": 5.00,
  "total_pool": 50.00
}
```

### `finish` — Finalização da Arena

**Fluxo:**

```
1. Valida autenticação
2. Credita prêmio do jogador (se ITM)
3. Credita soma dos prêmios dos bots ao Bot Treasury
4. Salva em game_history
5. Atualiza stats do jogador
6. Retorna resultado
```

**Payload:**
```json
{
  "action": "finish",
  "player_rank": 3,
  "player_prize": 5.00,
  "bot_prizes_total": 42.50,
  "arena_id": "uuid",
  "attempts": 5,
  "score": 1300,
  "time_remaining": 95.5,
  "won": true,
  "arena_buy_in": 0.55,
  "arena_pool": 50.00
}
```

## Tabela de Prêmios (ITM)

**ITM = 25% do field** (mínimo 1).

Para field de 100 jogadores → 25 posições pagas.

### Distribuição em Milésimos (‰) do Pool

| Posição | ‰ | % |
|---------|-----|------|
| 1º | 270 | 27,0% |
| 2º | 160 | 16,0% |
| 3º | 100 | 10,0% |
| 4º | 70 | 7,0% |
| 5º | 55 | 5,5% |
| 6º | 40 | 4,0% |
| 7º | 35 | 3,5% |
| 8º | 30 | 3,0% |
| 9º | 25 | 2,5% |
| 10º | 20 | 2,0% |
| 11º-15º | 15 cada | 1,5% |
| 16º-20º | 13 cada | 1,3% |
| 21º-25º | 11 cada | 1,1% |
| **Total** | **1000** | **100%** |

### Redistribuição Dinâmica

Para fields menores (ex: 4 jogadores → 1 ITM), os milésimos não utilizados são redistribuídos **proporcionalmente** entre as posições existentes, garantindo que a soma sempre = 1000‰.

## Buy-ins Pré-definidos

| Buy-in | Rake | Net |
|--------|------|-----|
| k$ 0,55 | k$ 0,05 | k$ 0,50 |
| k$ 1,10 | k$ 0,10 | k$ 1,00 |
| k$ 2,20 | k$ 0,20 | k$ 2,00 |
| k$ 5,50 | k$ 0,50 | k$ 5,00 |
| k$ 11,00 | k$ 1,00 | k$ 10,00 |

## Opções de Bots

| Bots | Total Players | ITM | Pool (buy-in k$ 0,55) |
|------|--------------|-----|----------------------|
| 3 | 4 | 1 | k$ 2,00 |
| 9 | 10 | 2 | k$ 5,00 |
| 19 | 20 | 5 | k$ 10,00 |
| 49 | 50 | 12 | k$ 25,00 |
| 99 | 100 | 25 | k$ 50,00 |

## Cálculo do Pool

```
pool = (bot_count + 1) × (buy_in - rake_fee)
```

## Cálculo do Prêmio

```
prize = pool × (permil / 1000)
```

Arredondado para 2 casas decimais.

## Rake

```
rake_rate = 1/11 ≈ 9,09%
total_rake = (bot_count + 1) × rake_fee
```

## Implementação Laravel

```php
// app/Services/ArenaEconomyService.php

class ArenaEconomyService
{
    public function enter(Profile $player, float $buyIn, float $rakeFee, int $botCount): array
    {
        return DB::transaction(function () use ($player, $buyIn, $rakeFee, $botCount) {
            // 1. Debit player
            $player->decrement('energy', $buyIn);
            
            // 2. Debit bot treasury
            BotTreasury::decrement('balance', $botCount * $buyIn);
            
            // 3. Credit Skema Box
            $totalRake = ($botCount + 1) * $rakeFee;
            SkemaBox::increment('balance', $totalRake);
            SkemaBoxTransaction::create([...]);
            
            return ['pool' => ($botCount + 1) * ($buyIn - $rakeFee)];
        });
    }
}
```
