# 06 — Motor do Jogo (SKEMIND)

## Visão Geral

O SKEMIND é uma implementação do clássico **Mastermind** com 6 símbolos e código de 4 posições sem repetição.

## Símbolos

| ID | Label | Cor | Hex |
|----|-------|-----|-----|
| `circle` | ● | Vermelho | `#E53935` |
| `square` | ■ | Azul | `#1E88E5` |
| `triangle` | ▲ | Verde | `#43A047` |
| `diamond` | ◆ | Amarelo | `#FDD835` |
| `star` | ★ | Roxo | `#8E24AA` |
| `hexagon` | ⬡ | Ciano | `#00BCD4` |

## Regras

| Parâmetro | Valor |
|-----------|-------|
| Símbolos disponíveis | 6 |
| Tamanho do código secreto | 4 |
| Repetição permitida | **NÃO** |
| Máximo de tentativas | 8 |
| Timer | 180 segundos |

## Geração do Código Secreto

Fisher-Yates shuffle nos 6 IDs, pega os 4 primeiros:

```typescript
function generateSecret(symbolIds: string[]): string[] {
  const ids = [...new Set(symbolIds)];
  // Fisher-Yates shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, 4);
}
```

## Algoritmo de Avaliação (Mastermind Clássico)

### 2 Passos

**Passo 1 — WHITES (posição exata)**
- Para cada posição `i`: se `guess[i] === secret[i]` → WHITE
- Remove essas posições da comparação

**Passo 2 — GRAYS (símbolo correto, posição errada)**
- Compara apenas os restantes
- Cada símbolo pode ser contado apenas uma vez (usa "bag" e remove ao encontrar)

```typescript
function evaluateGuess(secret: string[], guess: string[]): { whites: number; grays: number } {
  const secretCopy = [...secret];
  const guessCopy = [...guess];
  let whites = 0;

  // Passo 1: posições exatas
  const secretRemainder = [];
  const guessRemainder = [];
  
  for (let i = 0; i < 4; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      whites++;
    } else {
      secretRemainder.push(secretCopy[i]);
      guessRemainder.push(guessCopy[i]);
    }
  }

  // Passo 2: símbolos corretos em posição errada
  let grays = 0;
  const bag = [...secretRemainder];
  
  for (const g of guessRemainder) {
    const idx = bag.indexOf(g);
    if (idx !== -1) {
      grays++;
      bag.splice(idx, 1);
    }
  }

  return { whites, grays };
}
```

### Terminologia Visual

| Feedback | Significado | Cor na UI |
|----------|-------------|-----------|
| WHITE | Símbolo E posição corretos | ⚪ Branco |
| GRAY | Símbolo correto, posição errada | ⚫ Cinza/Preto |

## Condições de Vitória/Derrota

- **Vitória**: 4 whites (todas posições corretas)
- **Derrota**: 8 tentativas sem acertar OU timer zerou

## Sistema de Pontuação

| Componente | Valor |
|------------|-------|
| WHITE (posição correta) | +60 pontos |
| GRAY (símbolo correto) | +25 pontos |
| WIN (vitória) | +1.000 pontos |
| TIME BONUS (>120s restantes) | +700 pontos |
| TIME BONUS (60-120s) | +500 pontos |
| TIME BONUS (30-60s) | +300 pontos |
| TIME BONUS (<30s) | +100 pontos |

### Fórmula Total (vitória)

```
score = (whites × 60) + (grays × 25) + 1000 + time_bonus
```

## Score de Corrida Oficial (Server-Side)

Calculado na Edge Function `submit-race-result`:

```
score = BASE(1000 se won) + TIME_BONUS(time_remaining × 2) + ATTEMPT_BONUS((11 - attempts) × 50)
```

## Validação de Palpite

```typescript
function isValidGuess(guess: string[]): boolean {
  if (guess.length !== 4) return false;
  if (new Set(guess).size !== 4) return false;  // sem repetição
  return guess.every(id => SYMBOLS.some(s => s.id === id));
}
```

## RNG Ambiental (Visual Only)

O sistema possui um RNG "ambiental" baseado em seed que **não afeta a lógica do jogo**:

- Gera configuração visual determinística por `roundId`
- Controla: ordem do picker, pattern de fundo, rotação da grid, multiplicador de espaçamento
- Mesmo `roundId` = mesmo ambiente visual (determinístico)
- **NUNCA** interfere na geração do código secreto ou avaliação de palpites

## Implementação Laravel

```php
// app/Services/MastermindEngine.php

class MastermindEngine
{
    const SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'];
    const CODE_LENGTH = 4;
    const MAX_ATTEMPTS = 8;
    const GAME_DURATION = 180;

    public function generateSecret(): array
    {
        $shuffled = collect(self::SYMBOLS)->shuffle();
        return $shuffled->take(self::CODE_LENGTH)->values()->all();
    }

    public function evaluate(array $secret, array $guess): array
    {
        // Implementar algoritmo de 2 passos conforme descrito acima
    }
}
```
