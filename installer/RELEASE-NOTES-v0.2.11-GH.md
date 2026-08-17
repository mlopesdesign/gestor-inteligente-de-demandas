## v0.2.11 - Logo horizontal + sistema de abas em Configuracoes (estilo Salgueiro)

### Correcoes

- **Logo horizontal (paisagem) quebrada na topbar.** A imagem `mlopes dev` em paisagem agora aparece corretamente. O caminho antigo apontava pra um arquivo que nao existia — o app servia o `alt` "Gestor" e a logo aparecia quebrada. Corrigido.
- **Toast "Upgrade" persistente que apontava pra v0.2.9 antiga.** O `update.json` no GitHub Pages estava travado em v0.2.9. Agora aponta pra v0.2.11 e o toast nao aparece mais pedindo downgrade.
- **Path da logo do login** (mesmo bug da topbar).

### Novidades

- **Sistema de abas em Configuracoes estilo Salgueiro.** Nav horizontal com pilulas, scroll horizontal quando nao cabe, aba ativa em laranja. Duas abas:
  - **Geral** (todo o conteudo anterior: Perfil, Estatisticas, Exportar dados LGPD, Apagar conta, Sessao).
  - **Atualizacao** (nova): Versao instalada, status, botao "Verificar agora" pra checar update manualmente, card "Nova versao disponivel" com "Baixar e instalar" + "Depois" (voce decide quando aplicar), card "O que mudou" a direita com historico cliclavel de versoes do GitHub (v0.2.10 marcada como "INSTALADA").
- **Deep link `?aba=atualizacao` no URL.** Ex: `?rota=config&aba=atualizacao` abre direto na aba de Atualizacao. Util pra notificacao de nova versao com link.

### Validacao visual

Todas as 7 telas validadas em v0.2.11 (prints em `docs/FINAL-v0.2.11-*.png`):
- Home (Hoje): logo horizontal preta + v0.2.11 + 12 tarefas ativas reais
- Tarefas: tabela completa com 12 linhas
- Projetos: 4 cards (App IML Mobile, Identidade visual Recanto, Landing page Cacique, Site Cenario Alagoas)
- Clientes: tabela 4 clientes
- Areas: 3 cards (Comercial, Desenvolvimento, Design)
- Buscar: busca global
- Configuracoes - Geral: Perfil + Estatisticas (12/4/4/3)
- Configuracoes - Atualizacao: versao + verificar agora + historico de releases

### Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.11.exe` (5.35 MB, SHA-256 `DD35A50C803B6649CAF10F620E246857471AD611E02464677089ED19B3E98038`)
- `resources.neu` (7.55 MB)
- `update.json` no GH Pages apontando pra v0.2.11

### Notas tecnicas

- **Caminhos absolutos do Neutralino**: o `documentRoot: "/"` aponta pro diretorio do `.exe` no disco. TODOS os assets (HTML, CSS, JS, imagens) tem que estar em `src/...` no disco E/OU no `resources.neu`. Se o `src/` antigo ficar no `Program Files` (de instalacao anterior), o servidor usa o do disco (antigo) e ignora o `.neu` novo. Sempre limpar `src/` antigo antes de testar.
- **rcedit**: icone MLOPES DEV continua embutido no `.exe` via `rcedit-x64.exe --set-icon app-multires.ico`.
- **Cache WebView2**: limpo entre runs pra evitar carregar JS antigo.
