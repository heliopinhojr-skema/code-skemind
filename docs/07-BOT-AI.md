# 07 — Inteligência Artificial dos Bots

## Visão Geral

Os bots são entidades econômicas reais que participam de arenas. Cada bot tem um IQ que determina sua taxa de erro e estratégia de jogo.

## Níveis de IQ

| IQ | Taxa de Erro | Estratégia | Distribuição |
|----|-------------|------------|-------------|
| 80 | 20% | Eliminação básica, embaralha resultado | 30% |
| 90 | 12% | Retenção de whites na mesma posição | 20% |
| 100 | 6% | Tracking avançado, compara pares | 30% |
| 110 | 2% | Dedução precisa, quase perfeito | 20% |

## Distribuição de IQ

Para um field de 99 bots com distribuição padrão:
- ~30 bots IQ 80 (posições 0-29)
- ~20 bots IQ 90 (posições 30-49)
- ~30 bots IQ 100 (posições 50-79)
- ~20 bots IQ 110 (posições 80-99)

### IQ Customizado

Se a arena define `iq_min` e `iq_max` diferentes do padrão (80-110), distribui uniformemente em steps de 10:

```typescript
function assignBotIQ(index, totalBots, iqMin, iqMax) {
  const steps = [];
  for (let iq = iqMin; iq <= iqMax; iq += 10) steps.push(iq);
  return steps[index % steps.length];
}
```

## Estratégia por IQ

### IQ 80 — Básica
- Primeira tentativa: aleatória
- 20% de chance de palpite totalmente aleatório (erro)
- Elimina símbolos que tiveram 0 whites + 0 grays
- Mantém até `whites - 2` símbolos nas mesmas posições
- **Embaralha** o resultado final (não otimiza posições)

### IQ 90 — Moderada
- 12% de erro
- Mantém até `whites - 1` símbolos
- Tenta manter whites na **mesma posição** (mais inteligente)
- Reposiciona grays em posições diferentes da original

### IQ 100 — Avançada
- 6% de erro
- **Tracking de posições confirmadas**: compara pares de tentativas
- Se mesmo símbolo na mesma posição manteve ou aumentou whites → confirma
- Usa posições confirmadas como base fixa para próximos palpites

### IQ 110 — Precisa
- 2% de erro
- Mesma lógica do IQ 100 com 70% → 100% de confiança nas deduções
- Quase sempre encontra o código em 3-5 tentativas

## Tempo de "Pensamento"

Simula tempo humano. Bots mais inteligentes são mais rápidos:

```typescript
function getBotThinkTime(iq: number): number {
  // IQ 80: 4-9s | IQ 90: 3-7s | IQ 100: 2-5s | IQ 110: 1.5-4s
  const baseTime = Math.max(1500, 4000 - (iq - 80) * 80);
  const variance = Math.max(2000, 5000 - (iq - 80) * 80);
  return baseTime + Math.random() * variance + ((100 - iq) / 100) * 1000;
}
```

## Simulação Completa (`simulateBotGame`)

Simula uma partida inteira do bot para ranking em arenas:

```typescript
function simulateBotGame(secret, symbols, maxAttempts=8, duration=180, iq=80): BotGameState {
  const state = { attempts: 0, guessHistory: [], feedbackHistory: [], status: 'playing', score: 0 };
  let timeSpent = 0;

  while (status === 'playing' && attempts < maxAttempts) {
    timeSpent += getBotThinkTime(iq) / 1000;
    if (timeSpent >= duration) { status = 'lost'; break; }

    const guess = generateBotGuess(state, symbols, iq);
    const feedback = evaluate(secret, guess);
    
    score += (feedback.whites * 60) + (feedback.grays * 25);
    
    if (feedback.whites === 4) {
      status = 'won';
      score += 1000 + timeBonus(duration - timeSpent);
    }
  }
  return state;
}
```

## Nomes dos Bots

Palette de 16 nomes: `CyberMind`, `LogicBot`, `DeepThink`, `NeuroPlex`, `SynthBrain`, `CodeBreaker`, `MindMeld`, `ByteLogic`, `Axiom`, `Cerebrum`, `Cortex`, `Synapse`, `Quantum`, `Vector`, `Matrix`, `Cipher`

Avatars: `🤖 🧠 💻 🎯 ⚡ 🔮 🎲 🌟 🚀 💡`

## Implementação Laravel

```php
// app/Services/BotAIService.php

class BotAIService
{
    public function simulateGame(array $secret, int $iq = 80): array
    {
        // Simula partida completa
        // Retorna: attempts, score, won, time_remaining
    }

    public function generateGuess(array $history, int $iq): array
    {
        // Gera palpite baseado no histórico e IQ
    }

    public function createBotField(int $count, int $iqMin = 80, int $iqMax = 110): array
    {
        // Cria array de bots com IQ distribuído
    }
}
```
