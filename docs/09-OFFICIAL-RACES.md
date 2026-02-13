# 09 — Corridas Oficiais

## Visão Geral

Corridas oficiais são eventos agendados onde jogadores competem simultaneamente. O custo de inscrição é dividido entre prêmio e taxa do Skema Box.

## Status da Corrida

```
registration → playing → finished
```

| Status | Descrição |
|--------|-----------|
| `registration` | Aceitando inscrições |
| `playing` | Em andamento, aceitando resultados |
| `finished` | Encerrada |

## Configuração da Corrida

| Campo | Default | Descrição |
|-------|---------|-----------|
| `entry_fee` | k$ 1,10 | Taxa total de inscrição |
| `prize_per_player` | k$ 1,00 | Valor que vai para o pool |
| `skema_box_fee` | k$ 0,10 | Valor que vai para o Skema Box |
| `min_players` | 2 | Mínimo para iniciar |
| `max_players` | 16 | Máximo de inscritos |

## Fluxo de Inscrição

```
1. Jogador clica em "Inscrever"
2. Verifica saldo >= entry_fee
3. Debita entry_fee do jogador
4. Credita skema_box_fee ao Skema Box
5. Cria registro em race_registrations
```

## Cancelamento de Inscrição

```
1. Jogador clica em "Cancelar"
2. Credita entry_fee de volta ao jogador
3. Debita skema_box_fee do Skema Box (estorno)
4. Deleta registro de race_registrations
```

## Submissão de Resultado

Via Edge Function `submit-race-result`:

```
1. Valida JWT
2. Busca profile e corrida
3. Verifica corrida em status 'playing'
4. Verifica jogador inscrito
5. Verifica resultado não duplicado
6. Recalcula score server-side
7. Insere em race_results
8. Salva em game_history
9. Atualiza stats do jogador
```

## Score Server-Side

O score é **recalculado no servidor** para integridade:

```
BASE_SCORE = won ? 1000 : 0
TIME_BONUS = won && time_remaining ? time_remaining × 2 : 0
ATTEMPT_BONUS = won ? max(0, (11 - attempts) × 50) : 0

FINAL_SCORE = BASE_SCORE + TIME_BONUS + ATTEMPT_BONUS
```

### Exemplos

| Cenário | Attempts | Time Remaining | Score |
|---------|----------|---------------|-------|
| Vitória rápida | 3 | 150s | 1000 + 300 + 400 = 1700 |
| Vitória normal | 5 | 90s | 1000 + 180 + 300 = 1480 |
| Vitória lenta | 7 | 20s | 1000 + 40 + 200 = 1240 |
| Derrota | 8 | 0s | 0 |

> Nota: tolerância de ±50 pontos entre score do cliente e servidor. O server sempre prevalece.

## Implementação Laravel

```php
// app/Http/Controllers/RaceController.php

class RaceController extends Controller
{
    public function register(Request $request, Race $race)
    {
        DB::transaction(function () use ($request, $race) {
            $player = $request->user()->profile;
            
            // Debit entry fee
            $player->decrement('energy', $race->entry_fee);
            
            // Credit Skema Box
            app(SkemaBoxService::class)->credit(
                $race->skema_box_fee, 'official_rake', "Corrida: {$race->name}"
            );
            
            // Register
            RaceRegistration::create([
                'race_id' => $race->id,
                'player_id' => $player->id,
            ]);
        });
    }

    public function submitResult(Request $request, Race $race)
    {
        // Validar, recalcular score server-side, salvar
    }
}
```
