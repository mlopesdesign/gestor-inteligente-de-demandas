# v0.2.8 — 16/08/2026

## Correcoes criticas

- **Bug fatal do SQL `cancelada_em` / `cancelada_motivo` / `adiada_ate` / `adiada_motivo`**: o `tarefas.js` referenciava 4 colunas que nao existiam no schema do banco. Toda a tela "Hoje" quebrava com `no such column: t.cancelada_em`. Adicionadas as 6 colunas faltantes (`cancelada_em`, `cancelada_motivo`, `adiada_ate`, `adiada_motivo`, `recorrencia_tipo`, `recorrencia_data_base`) com migracao idempotente no `db.js:migrar()`. Banco antigo atualiza automaticamente na proxima abertura.
- **Bug `t.recorrencia_tipo`**: mesma classe de problema, coluna adicionada no schema e na migracao.

## UX

- **Todos os emojis removidos** (menu lateral, topbar, buckets, botoes, secoes). Substituidos por texto limpo.
- **Tela de login refeita** com layout clean: card centralizado, brand com logo + nome + subtitulo, separador, secao "Sua conta" com explicacao, form com labels claros, botoes primarios, versao no rodape. Sem o `alt="mlopes dev"`.
- **Versao hardcoded v0.1.0 corrigida**: o `Hoje` mostrava "v0.1.0" porque tinha um fallback hardcoded. Agora atualiza junto com o `__app_version`.
- **Sessao invalida no localStorage limpa automaticamente**: antes, se o token antigo era invalido, o app abria direto em "Hoje" com erro `NAO_AUTENTICADO`. Agora valida via `sessao:atual` e se falhar, limpa o `lembrar` e redireciona pra tela de login.

## Instalacao

- Atualiza automaticamente (auto-update pelo GitHub).
- Se a v0.2.6/v0.2.7 estiver instalada, abre o app e clica em "Atualizar agora" no toast que aparece no canto inferior.
- Banco do cliente preservado (roda migracao idempotente).

## Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.8.exe` (~3.2 MB)
- `resources.neu` (~2.9 MB)
- `sha256sums.txt`
