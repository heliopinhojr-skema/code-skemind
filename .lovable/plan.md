
# Realocar Stats (Corridas, Vitorias, Melhor, Universo) para o final dos Lobbies

## O que muda

Os blocos de estatisticas rapidas (Vitorias, Corridas, Melhor Tempo, Universo) estao atualmente no **header** dos lobbies. Serao movidos para a **base da area rolavel**, logo antes da taxa de transferencia e mensagens de erro.

## Componentes afetados

### 1. `src/components/skema/SkemaLobby.tsx`
- **Remover** o grid de stats das linhas 496-517 (dentro do `<motion.header>`)
- **Remover** o bloco Skema Box (linhas 518-523) que fica logo abaixo dos stats
- **Inserir** ambos os blocos antes da "Taxa de transferencia" (antes da linha 982), na area rolavel inferior
- O grid mantem as 4 colunas: Vitorias | Corridas | Melhor | Universo
- O Skema Box (master_admin) continua logo abaixo do grid de stats

### 2. `src/components/tournament/TournamentLobby.tsx`
- **Remover** o grid de stats das linhas 329-343 (dentro do `<motion.header>`)
- **Inserir** o grid na parte inferior do conteudo rolavel, antes do final da pagina
- O grid mantem as 3 colunas: Vitorias | Corridas | Melhor

## Resultado visual

**Header** fica mais compacto: apenas avatar, nome, tier, calendario, saldo e botoes.

**Base do lobby** ganha uma secao de estatisticas pessoais com o mesmo visual atual (cards semi-transparentes), posicionada apos o Extrato e antes da taxa de transferencia.

## Secao tecnica

### SkemaLobby.tsx
- Cortar linhas 496-523 (grid stats + Skema Box)
- Colar entre o `PlayerGameHistory` (linha 980) e o bloco "Taxa" (linha 982), encapsulado em `<motion.section>` com delay ajustado

### TournamentLobby.tsx  
- Cortar linhas 329-343 (grid 3 colunas)
- Colar no final da area rolavel (`pb-28`), antes do fechamento do `</div>`

Nenhuma dependencia nova. Nenhuma mudanca de logica, apenas reposicionamento de JSX.
