# v0.2.11 — 2026-08-17

## Correções

- **Logo horizontal (paisagem) quebrada na topbar.** A imagem `mlopes dev` em paisagem agora aparece corretamente. O caminho antigo (`/resources/images/logo-icon.png`) estava apontando pra um arquivo que não existe — o app servia o `alt` "Gestor" e a logo aparecia quebrada. Corrigido pra `/src/resources/images/logo.png` (a horizontal preta com lâmpada + texto).
- **Toast "Upgrade" persistente que apontava pra v0.2.9 antiga.** O `update.json` no GitHub Pages estava travado em v0.2.9 (versão anterior). Agora aponta pra v0.2.11 e o toast não aparece mais pedindo downgrade.
- **Path da logo do login** (`/resources/images/logo-login.png` → `/src/resources/images/logo-login.png`) — mesmo bug do item 1.

## Novidades

- **Sistema de abas em Configurações estilo Salgueiro.** Nav horizontal com pílulas, scroll horizontal quando não cabe, aba ativa em laranja. Duas abas:
  - **Geral** (todo o conteúdo anterior: Perfil, Estatísticas, Exportar dados LGPD, Apagar conta, Sessão).
  - **Atualização** (nova): Versão instalada + status, botão "Verificar agora" pra checar update manualmente, card "Nova versão disponível" com botão "Baixar e instalar" + "Depois" (você decide quando aplicar), card "O que mudou" à direita com histórico clicável de versões do GitHub (v0.2.10 marcada como "INSTALADA").
- **Deep link `?aba=atualizacao` no URL.** Ex: `?rota=config&aba=atualizacao` abre direto na aba de Atualização. Útil pra notificação de nova versão com link.

## Validação visual

Todas as 7 telas validadas em v0.2.11 (prints em `docs/FINAL-v0.2.11-*.png`):
- **Home (Hoje)**: logo horizontal preta + "v0.2.11" no header, 12 tarefas ativas reais do banco, agrupadas em Atrasadas / Vencendo hoje / Esta semana / Em andamento.
- **Tarefas**: tabela completa com filtros (status, área, projeto), 12 linhas, badge colorido por prioridade/status, datas relativas.
- **Projetos**: 4 cards (App IML Mobile, Identidade visual Recanto, Landing page Cacique, Site Cenário Alagoas) com contagem de tarefas ativas/total.
- **Clientes**: tabela 4 clientes (Ana Paula/Cenário Alagoas, Bruno Costa/Recanto, Carla Mendes/Cacique, Diego Rocha/IML) com projetos e tarefas ativas vinculadas.
- **Áreas**: 3 cards (Comercial 2, Desenvolvimento 4, Design 4).
- **Buscar**: busca global com placeholder.
- **Configurações → Geral**: nav de abas (Geral ativa), Perfil (Marcio Lopes, demo@gestor.local, America/Sao_Paulo, PROFISSIONAL, 08:00-18:00), Estatísticas (12/4/4/3), LGPD, Sessão.
- **Configurações → Atualização**: card "Atualização do sistema" (v0.2.11, botão "Verificar agora") + card "O que mudou" com lista de releases do GitHub (v0.2.10 marcada como INSTALADA, depois v0.2.9, v0.2.8, v0.2.7, v0.2.6, v0.2.4, v0.2.3, v0.2.2 — clique pra ver detalhes).

## Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.11.exe` (5.35 MB, SHA-256 `DD35A50C803B6649CAF10F620E246857471AD611E02464677089ED19B3E98038`)
- `resources.neu` (7.55 MB)
- `update.json` no GH Pages apontando pra v0.2.11

## Notas técnicas

- **Caminhos absolutos do Neutralino**: o `documentRoot: "/"` do `neutralino.config.json` aponta pro diretório do `.exe` no disco. TODOS os assets (HTML, CSS, JS, imagens) têm que estar em `src/...` no disco E/OU no `resources.neu`. Se o `src/` antigo ficar no `Program Files` (de instalação anterior), o servidor usa o do disco (antigo) e ignora o `.neu` novo. **Sempre limpar `src/` antigo antes de testar** (ou copiar o novo por cima).
- **rcedit**: o ícone MLOPES DEV continua embutido no `.exe` via `rcedit-x64.exe --set-icon app-multires.ico`.
- **Cache WebView2**: limpo entre runs pra evitar carregar JS antigo (Default/Cache, Default/Code Cache, Default/Local Storage, Default/Session Storage em `%APPDATA%\GestorInteligenteDeDemandas.exe\EBWebView\`).
