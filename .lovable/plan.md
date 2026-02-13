

# Documentacao Completa do Projeto SKEMA para Backend Laravel

## Objetivo

Criar uma pasta `docs/` na raiz do projeto contendo arquivos `.md` com toda a documentacao necessaria para reconstruir o backend em Laravel, incluindo schemas de banco de dados, logica de negocio, regras economicas, funcoes RPC, Edge Functions e fluxos de autenticacao.

## Arquivos a Criar

### `docs/README.md`
Indice geral com links para todos os documentos, visao geral do projeto e stack atual.

### `docs/01-DATABASE-SCHEMA.md`
Schema completo de todas as 12 tabelas com:
- Colunas, tipos, defaults, nullable
- Foreign keys e indices
- Politicas RLS (traduzidas para middleware/policies Laravel)
- Enum `app_role` (master_admin, guardiao, grao_mestre, mestre, jogador)

### `docs/02-AUTHENTICATION.md`
Fluxo de autenticacao detalhado:
- Login por nickname + PIN de 4 digitos (email derivado: `nickname@skema.game`)
- Senha: `PIN + "SK"` (ex: `1234SK`)
- Registro com codigo de convite obrigatorio
- Sem recuperacao de conta (regra de negocio intencional)
- Codigos master: SKEMA1, SKEMA2024, PRIMEIROSJOGADORES, BETATESTER, DEUSPAI
- Persistencia do ultimo nickname no localStorage

### `docs/03-TIER-HIERARCHY.md`
Hierarquia completa de tiers e economia de convites:
- HX (master_admin): 10M k$ iniciais, convida Criadores (k$ 200.000 cada, 7 vagas)
- Criador: convida Grao Mestre (k$ 15.000, 10 vagas)
- Grao Mestre: convida Mestre (k$ 1.300, 10 vagas)
- Mestre: convida Boom (k$ 130, 10 vagas)
- Boom: convida Ploft (k$ 10, 10 vagas)
- Ploft: nivel base, k$ 2 bloqueados, k$ 8 livres
- Mapeamento tier para role no `user_roles`
- Calculo de saldo bloqueado/disponivel (`tierEconomy.ts`)

### `docs/04-INVITE-SYSTEM.md`
Sistema de convites DNA:
- Codigos SKINV (gerados automaticamente via RPC `generate_invite_code`)
- Ciclo de vida: gerado -> compartilhado -> aceito
- Validacao via RPC `validate_invite_code` (master codes + SKINV + legacy SK codes)
- Debito do saldo do convidador apenas na redencao
- Cancelamento de convites com re-geracao
- Links de convite: `https://dominio/auth?convite=CODE`

### `docs/05-ECONOMY-ZERO-SUM.md`
Sistema economico fechado de 10M k$:
- 4 pilares: HX, Jogadores, Skema Box, Bot Treasury
- Skema Box: coleta rake de arenas (9.09%), taxa de corridas (k$ 0.10), taxa de transferencias (6.43%)
- Bot Treasury: financia participacao de bots em arenas
- Transferencias P2P: apenas Grao Mestre+, taxa 6.43% para Skema Box
- Formatacao monetaria: `k$ 200.000,00` (formato brasileiro)
- Aritmetica em centavos para evitar floating-point

### `docs/06-GAME-ENGINE.md`
Motor do jogo Mastermind (SKEMIND):
- 6 simbolos: circle (vermelho), square (azul), triangle (verde), diamond (amarelo), star (roxo), hexagon (ciano)
- Codigo secreto: 4 simbolos unicos (sem repeticao)
- Maximo 8 tentativas, timer de 180 segundos
- Feedback: whites (posicao correta) + grays (simbolo correto, posicao errada)
- Algoritmo de avaliacao em 2 passos (classico Mastermind)
- Pontuacao: WHITE=60, GRAY=25, WIN=1000, TIME_BONUS (100-700)
- RNG ambiental (seeded, apenas visual, nao afeta logica)

### `docs/07-BOT-AI.md`
Inteligencia artificial dos bots:
- 4 niveis de IQ: 80 (20% erro), 90 (12%), 100 (6%), 110 (2%)
- Distribuicao padrao: 30% IQ80, 20% IQ90, 30% IQ100, 20% IQ110
- Estrategias por IQ: eliminacao basica (80) ate deducao precisa (110)
- Tempo de "pensamento" proporcional ao IQ
- Simulacao completa de partida (`simulateBotGame`)

### `docs/08-ARENA-ECONOMY.md`
Edge Function `process-arena-economy`:
- Acao `enter`: debita jogador, debita Bot Treasury, credita rake ao Skema Box
- Acao `finish`: credita premio ao jogador (se ITM), credita premios dos bots ao Bot Treasury
- Tabela de premios ITM (25% do field): distribuicao em milesimos com redistribuicao dinamica
- Buy-ins pre-definidos: k$ 0.55 / 1.10 / 2.20 / 5.50 / 11.00
- Opcoes de bots: 3, 9, 19, 49, 99
- Rollback em caso de falha

### `docs/09-OFFICIAL-RACES.md`
Corridas oficiais:
- Tabela `official_races` com status: registration -> playing -> finished
- Inscricao com taxa (entry_fee) e estorno ao cancelar
- Submissao de resultado via Edge Function `submit-race-result`
- Score server-side: BASE(1000) + TIME_BONUS(time*2) + ATTEMPT_BONUS((11-attempts)*50)

### `docs/10-TRANSFER-ENERGY.md`
Edge Function `transfer-energy`:
- Restricao: apenas Grao Mestre e acima
- Validacao de saldo disponivel (exclui bloqueado por convites)
- Taxa de 6.43% para o Skema Box
- Operacao atomica com rollback
- Validacao: conta bloqueada, auto-transferencia, destinatario bloqueado

### `docs/11-RPC-FUNCTIONS.md`
Todas as 13 funcoes RPC documentadas:
- `register_player`: registro atomico com hierarquia de tiers
- `validate_invite_code`: validacao de codigos (master + SKINV + legacy)
- `generate_invite_code`: geracao de codigos SKINV unicos
- `share_invite_code` / `cancel_invite_code`: gestao de convites
- `choose_generation_color`: cor de geracao para Criadores (propagacao recursiva)
- `update_player_energy` / `update_skema_box` / `update_bot_treasury`: operacoes atomicas
- `admin_*`: funcoes administrativas (adjust_energy, set_status, delete_player)
- `has_role`: verificacao de role sem recursao RLS
- `set_user_role_and_tier`: gestao de roles por master_admin

### `docs/12-GUARDIAN-PANEL.md`
Painel administrativo Guardian:
- Auditoria de soma zero (10M k$)
- Gestao de jogadores (bloquear, ajustar saldo, deletar)
- Gestao de arenas (criar, editar, fechar)
- Arvore de referrals
- Monitoramento de interesse em investir
- Gestao de corridas oficiais

### `docs/13-SECURITY-POLICIES.md`
Mapeamento de todas as politicas RLS para middleware/gates Laravel:
- Cada tabela com suas regras de acesso (SELECT, INSERT, UPDATE, DELETE)
- Funcao `has_role` como gate/middleware
- Roles e permissoes por tier

### `docs/14-API-ENDPOINTS.md`
Mapeamento de todas as operacoes para endpoints REST Laravel:
- Auth: POST /auth/login, POST /auth/register
- Profiles: GET/PUT /profile
- Arenas: CRUD /arenas, POST /arenas/enter, POST /arenas/finish
- Races: CRUD /races, POST /races/register, POST /races/submit
- Transfers: POST /transfers
- Invites: GET/POST/DELETE /invites
- Admin: /admin/* (protegido por middleware)

---

## Secao Tecnica

### Arquivos Criados
| Arquivo | Descricao |
|---------|-----------|
| `docs/README.md` | Indice e visao geral |
| `docs/01-DATABASE-SCHEMA.md` | Schema completo das 12 tabelas |
| `docs/02-AUTHENTICATION.md` | Fluxo de autenticacao |
| `docs/03-TIER-HIERARCHY.md` | Hierarquia de tiers e economia |
| `docs/04-INVITE-SYSTEM.md` | Sistema de convites DNA |
| `docs/05-ECONOMY-ZERO-SUM.md` | Economia fechada de 10M |
| `docs/06-GAME-ENGINE.md` | Motor do jogo Mastermind |
| `docs/07-BOT-AI.md` | IA dos bots multi-IQ |
| `docs/08-ARENA-ECONOMY.md` | Economia das arenas |
| `docs/09-OFFICIAL-RACES.md` | Corridas oficiais |
| `docs/10-TRANSFER-ENERGY.md` | Transferencias P2P |
| `docs/11-RPC-FUNCTIONS.md` | Todas as funcoes RPC |
| `docs/12-GUARDIAN-PANEL.md` | Painel administrativo |
| `docs/13-SECURITY-POLICIES.md` | Politicas de seguranca |
| `docs/14-API-ENDPOINTS.md` | Mapeamento de endpoints REST |

### Arquivos Modificados
Nenhum arquivo existente sera modificado.

