# 05 — Economia de Soma Zero

## Princípio Fundamental

O universo SKEMA é um **sistema fechado** com exatamente **10.000.000,00 k$** (dez milhões). Energia nunca é criada nem destruída — apenas transferida entre os 4 pilares.

## Os 4 Pilares

```
┌──────────────────────────────────────────────────────────┐
│                   10.000.000,00 k$                       │
├──────────┬──────────┬──────────────┬─────────────────────┤
│  HX      │ Jogadores│  Skema Box   │   Bot Treasury      │
│(Tesouro) │ (todos)  │  (rake/taxas)│   (fundo dos bots)  │
└──────────┴──────────┴──────────────┴─────────────────────┘
```

### Pilar 1: HX (Tesouro)
- Conta do `master_admin`
- Fonte inicial de toda a energia
- Debita ao criar Criadores (k$ 200.000 cada)
- Pode doar para Bot Treasury

### Pilar 2: Jogadores
- Soma de `energy` de todos os profiles (exceto master_admin)
- Dividido em saldo **bloqueado** (reserva para convites) e **disponível**

### Pilar 3: Skema Box
- Singleton: `id = '00000000-0000-0000-0000-000000000001'`
- Fontes de receita:
  - **Arena rake**: 9,09% (1/11) do buy-in total
  - **Corrida oficial**: k$ 0,10 por inscrição
  - **Taxa de transferência**: 6,43% sobre transferências P2P

### Pilar 4: Bot Treasury
- Singleton: `id = '00000000-0000-0000-0000-000000000002'`
- Financia buy-ins dos bots em arenas
- Recebe prêmios dos bots de volta
- Capitalizado pelo HX (doações)

## Fluxos de Energia

### Convite (HX → Jogador)
```
HX -[k$ 200.000]→ Criador (novo)
```

### Convite (Jogador → Jogador)
```
Criador -[k$ 15.000]→ Grão Mestre (novo)
```

### Arena (entrada)
```
Jogador -[buy_in]→ (debita)
Bot Treasury -[buy_in × bots]→ (debita)
→ Skema Box +[rake total]
```

### Arena (finalização)
```
Pool → Jogador (se ITM: +prêmio)
Pool → Bot Treasury (+prêmios dos bots)
```

### Transferência P2P
```
Remetente -[valor + 6,43%]→ (debita)
Destinatário +[valor]→ (credita)
Skema Box +[6,43% taxa]→ (credita)
```

### Corrida Oficial (inscrição)
```
Jogador -[entry_fee (k$ 1,10)]→ (debita)
Skema Box +[skema_box_fee (k$ 0,10)]→ (credita)
Pool da corrida += prize_per_player (k$ 1,00)
```

## Auditoria

O painel Guardian exibe em tempo real:

```
∑ = HX + Jogadores + Skema Box + Bot Treasury = 10.000.000,00 k$
```

Qualquer desvio é mostrado como **delta** para reconciliação.

## Aritmética Segura

### Regra de Ouro: CENTAVOS

Toda operação monetária deve:
1. Converter para centavos: `value × 100` → inteiro
2. Operar com inteiros
3. Reconverter: `cents / 100`

```typescript
// ERRADO ❌
const result = 0.1 + 0.2; // 0.30000000000000004

// CORRETO ✅
const resultCents = 10 + 20; // 30
const result = resultCents / 100; // 0.30
```

### Helpers

```typescript
function toCents(value: number): number { return Math.round(value * 100); }
function fromCents(cents: number): number { return cents / 100; }
function roundCurrency(value: number): number { return fromCents(toCents(value)); }
function addCurrency(a: number, b: number): number { return fromCents(toCents(a) + toCents(b)); }
```

## Formatação Monetária

Padrão brasileiro: `k$ 200.000,00`

```typescript
function formatEnergy(energy: number): string {
  return `k$ ${energy.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}
```

Em Laravel:
```php
function formatEnergy(float $energy): string {
    return 'k$ ' . number_format($energy, 2, ',', '.');
}
```
