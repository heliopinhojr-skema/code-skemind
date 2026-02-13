# SKEMA — Documentação Completa para Backend Laravel

## Visão Geral

O **SKEMA** é uma plataforma de jogos multiplayer baseada no Mastermind (chamado **SKEMIND**), com uma economia fechada de exatamente **10.000.000,00 k$** (moeda virtual). O sistema possui hierarquia de tiers, convites DNA, arenas contra bots com IA multi-IQ, corridas oficiais e um painel administrativo (Guardian).

### Stack Atual (Frontend / Demo)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + RLS)
- **Hospedagem**: Lovable Cloud

### Stack Alvo (Produção)
- **Backend**: Laravel 11+ (PHP 8.2+)
- **Banco de Dados**: PostgreSQL 15+
- **Autenticação**: Laravel Sanctum ou Passport
- **Cache**: Redis
- **Queue**: Laravel Horizon

---

## Índice de Documentos

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [DATABASE-SCHEMA](./01-DATABASE-SCHEMA.md) | Schema completo das 14 tabelas |
| 02 | [AUTHENTICATION](./02-AUTHENTICATION.md) | Fluxo de autenticação (nickname + PIN) |
| 03 | [TIER-HIERARCHY](./03-TIER-HIERARCHY.md) | Hierarquia de tiers e economia de convites |
| 04 | [INVITE-SYSTEM](./04-INVITE-SYSTEM.md) | Sistema de convites DNA (SKINV) |
| 05 | [ECONOMY-ZERO-SUM](./05-ECONOMY-ZERO-SUM.md) | Economia fechada de 10M k$ |
| 06 | [GAME-ENGINE](./06-GAME-ENGINE.md) | Motor do jogo Mastermind (SKEMIND) |
| 07 | [BOT-AI](./07-BOT-AI.md) | Inteligência artificial dos bots multi-IQ |
| 08 | [ARENA-ECONOMY](./08-ARENA-ECONOMY.md) | Economia das arenas (Edge Function) |
| 09 | [OFFICIAL-RACES](./09-OFFICIAL-RACES.md) | Corridas oficiais |
| 10 | [TRANSFER-ENERGY](./10-TRANSFER-ENERGY.md) | Transferências P2P |
| 11 | [RPC-FUNCTIONS](./11-RPC-FUNCTIONS.md) | Todas as funções RPC (→ Services Laravel) |
| 12 | [GUARDIAN-PANEL](./12-GUARDIAN-PANEL.md) | Painel administrativo Guardian |
| 13 | [SECURITY-POLICIES](./13-SECURITY-POLICIES.md) | Políticas de segurança (RLS → Middleware) |
| 14 | [API-ENDPOINTS](./14-API-ENDPOINTS.md) | Mapeamento de endpoints REST Laravel |

---

## Constantes Globais

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `TOTAL_SUPPLY` | 10.000.000,00 k$ | Supply fixo do universo |
| `TRANSFER_TAX` | 6,43% | Taxa sobre transferências P2P |
| `ARENA_RAKE` | 9,09% (1/11) | Rake sobre buy-in de arenas |
| `RACE_FEE` | k$ 0,10 | Taxa fixa por inscrição em corrida |
| `MAX_ATTEMPTS` | 8 | Máximo de tentativas por partida |
| `GAME_DURATION` | 180 segundos | Timer da partida |
| `CODE_LENGTH` | 4 | Tamanho do código secreto |
| `ITM_PERCENT` | 25% | Percentual do field que recebe prêmio |

---

## Formato Monetário

Todas as operações monetárias usam **aritmética em centavos** (inteiros) para evitar erros de floating-point.

- Formato de exibição: `k$ 200.000,00` (padrão brasileiro)
- Armazenamento: `NUMERIC` no banco de dados
- Cálculos internos: converter para centavos (`value * 100`), operar, reconverter
