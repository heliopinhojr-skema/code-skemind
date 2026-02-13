# 03 — Hierarquia de Tiers

## Pirâmide de Tiers

```
              ┌─────┐
              │ HX  │  master_admin — Fonte: 10M k$
              └──┬──┘
          ┌──────┴──────┐
          │  Criador    │  guardiao — 7 vagas × k$ 200.000
          └──────┬──────┘
        ┌────────┴────────┐
        │  Grão Mestre    │  grao_mestre — 10 vagas × k$ 15.000
        └────────┬────────┘
          ┌──────┴──────┐
          │   Mestre    │  mestre — 10 vagas × k$ 1.300
          └──────┬──────┘
           ┌─────┴─────┐
           │   Boom    │  jogador — 10 vagas × k$ 130
           └─────┬─────┘
            ┌────┴────┐
            │  Ploft  │  jogador — Nível base (sem convites)
            └─────────┘
```

## Configuração Econômica por Tier

| Tier | Role (`app_role`) | Max Convites | Custo/Convite (k$) | Tier Convidado | Base Bloqueada (k$) |
|------|-------------------|--------------|---------------------|----------------|---------------------|
| HX (master_admin) | `master_admin` | 7 | 200.000,00 | Criador | 0 |
| CD HX | `master_admin` | 7 | 200.000,00 | Criador | 0 |
| Criador | `guardiao` | 10 | 15.000,00 | Grão Mestre | 0 |
| Grão Mestre | `grao_mestre` | 10 | 1.300,00 | Mestre | 0 |
| Mestre | `mestre` | 10 | 130,00 | Boom | 0 |
| Boom | `jogador` | 10 | 10,00 | Ploft | 0 |
| Ploft | `jogador` | 0 | 0 | — | 2,00 |

## Cálculo de Saldo Bloqueado / Disponível

```
saldo_bloqueado = (max_convites - convites_realizados) × custo_por_convite + base_bloqueada
saldo_disponivel = MAX(0, saldo_total - saldo_bloqueado)
```

### Exemplos

**Criador recém-criado** (k$ 200.000, 0 convites):
- Bloqueado: `10 × 15.000 + 0 = k$ 150.000`
- Disponível: `200.000 - 150.000 = k$ 50.000`

**Ploft** (k$ 10):
- Bloqueado: `0 × 0 + 2 = k$ 2`
- Disponível: `10 - 2 = k$ 8`

**Boom com 5 convites feitos** (k$ 130, 5 convites):
- Bloqueado: `(10 - 5) × 10 = k$ 50`
- Disponível: `130 - 50 = k$ 80`

## Mapeamento Tier ↔ Role

| Tier (profile) | Role (user_roles) | Permissões |
|----------------|-------------------|------------|
| master_admin | `master_admin` | Tudo: CRUD em qualquer tabela, ajuste de saldos |
| Criador | `guardiao` | Visualizar todos os jogadores, criar arenas, gerenciar convites |
| Grão Mestre | `grao_mestre` | Criar arenas, transferir energia, gerenciar convites |
| Mestre | `mestre` | Gerenciar convites, jogar |
| Boom | `jogador` | Gerenciar convites, jogar |
| Ploft | `jogador` | Apenas jogar |

## Cor de Geração

- Apenas **Criadores** podem escolher uma cor de geração
- A cor é **única** por Criador (não pode repetir)
- Quando escolhida, **propaga recursivamente** para todos os descendentes
- Não pode ser alterada após a escolha

### Cores Disponíveis (palette)

As cores são definidas no componente `GenerationColorPicker` e incluem 12+ opções como:
crimson, sunset, amber, emerald, ocean, royal, violet, magenta, rose, teal, slate, bronze

## Implementação Laravel

```php
// app/Services/TierEconomyService.php

class TierEconomyService
{
    private const TIER_CONFIG = [
        'master_admin' => ['maxInvites' => 7, 'costPerInvite' => 200000, 'invitedTier' => 'Criador', 'baseLocked' => 0],
        'Criador'      => ['maxInvites' => 10, 'costPerInvite' => 15000, 'invitedTier' => 'Grão Mestre', 'baseLocked' => 0],
        'Grão Mestre'  => ['maxInvites' => 10, 'costPerInvite' => 1300, 'invitedTier' => 'Mestre', 'baseLocked' => 0],
        'Mestre'       => ['maxInvites' => 10, 'costPerInvite' => 130, 'invitedTier' => 'Boom', 'baseLocked' => 0],
        'Boom'         => ['maxInvites' => 10, 'costPerInvite' => 10, 'invitedTier' => 'Ploft', 'baseLocked' => 0],
        'Ploft'        => ['maxInvites' => 0, 'costPerInvite' => 0, 'invitedTier' => '', 'baseLocked' => 2],
    ];

    public function calculateBalanceBreakdown(float $energy, string $tier, int $invitesSent): array
    {
        $config = self::TIER_CONFIG[$tier] ?? self::TIER_CONFIG['Ploft'];
        $slotsRemaining = max(0, $config['maxInvites'] - $invitesSent);
        $inviteLocked = $slotsRemaining * $config['costPerInvite'];
        $totalLocked = $inviteLocked + $config['baseLocked'];
        $effectiveLocked = min($totalLocked, $energy);
        $available = max(0, $energy - $effectiveLocked);

        return [
            'total' => $energy,
            'locked' => $effectiveLocked,
            'available' => $available,
            'slotsRemaining' => $slotsRemaining,
            'costPerInvite' => $config['costPerInvite'],
        ];
    }
}
```
