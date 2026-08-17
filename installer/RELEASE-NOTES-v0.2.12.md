# v0.2.12 — 2026-08-17

## >>> DOWNLOAD DO INSTALADOR <<<

**LINK DIRETO DO SETUP.EXE (v0.2.12, Windows 10/11, ~5.4 MB):**

**https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.12/GestorInteligenteDeDemandas-Setup-0.2.12.exe**

> **ATENCAO** — os outros 2 assets (`resources.neu` e `RELEASE-NOTES-v0.2.12.md`) NAO SAO O INSTALADOR. O `resources.neu` e' so o bundle de auto-update do app ja instalado. Baixe **APENAS** o `Setup.exe`.

> Se o Windows SmartScreen bloquear ("Protecao Microsoft Defender SmartScreen impediu..."), clique em "Mais informacoes" -> "Executar mesmo assim".

## Novidades

- **Nova aba Backup em Configuracoes** (estilo Salgueiro, 3 abas agora: **Geral** | **Backup** | **Atualizacao**):
  - **Backup manual**: botao "Fazer backup agora" copia o banco SQLite pra `%APPDATA%\GestorInteligenteDeDemandas\dados\backups\gestor-YYYYMMDD-HHMMSS.db` via `copy /Y` do Windows (confiavel pra binario). Registra na tabela `backups`.
  - **Backup automatico**: toggle on/off + frequencia (diaria / semanal / a cada abertura) + hora preferida (informativo) + retencao (manter ultimos N, padrao 30). Hook no boot do app verifica se ja passou o intervalo e cria backup automatico. Politica de retencao remove os mais antigos.
  - **Historico de backups**: lista todos os backups com data, tamanho, origem (manual/auto/pre-restore), observacao. Clique em um item pra ver detalhes + botoes "Restaurar" e "Excluir".
  - **Restaurar backup**: cria backup de seguranca (pre-restore) antes de copiar o backup selecionado sobre o banco atual. Reinicia o app apos 2.5s.
  - **Excluir backup**: remove o arquivo do disco + marca como `excluido` na tabela (mantem historico).
- **README no GitHub** com link direto pro Setup.exe + instrucoes de instalacao (resolve o problema do "irmao tentou baixar e nao baixou" — o link do `Setup.exe` agora esta obvio no README, sem precisar procurar nos assets).
- **Release v0.2.11 marcada como Latest** no GitHub antes de subir v0.2.12 (pra quem ainda ta na v0.2.10 auto-atualizar pra v0.2.11 antes de pegar v0.2.12 manual).

## Tabela nova no banco

`backups (id, criado_em, caminho, tamanho_bytes, origem, observacao, sha256, status)` — criada via `CREATE TABLE IF NOT EXISTS` no schema.sql, idempotente.

## Rotas novas no servidor

`backup:criar`, `backup:listar`, `backup:restaurar`, `backup:excluir`, `backup:obterAuto`, `backup:salvarAuto`, `backup:aplicarAuto`.

## Validacao visual (7 telas em v0.2.12)

- Home / Tarefas / Projetos / Clientes / Areas / Buscar — todas com logo horizontal preta + v0.2.12 no header
- Configuracoes - Geral (Perfil, Estatisticas 12/4/4/3, LGPD, Sessao)
- **Configuracoes - Backup (NOVO)**: card "Fazer backup agora" + botao laranja, card "Backup automatico" (toggle/frequencia/hora/retencao), card direito "Historico de backups" (lista com data, tamanho, origem, observacao, acoes "Restaurar" + "Excluir")
- Configuracoes - Atualizacao (card esquerdo versao+verificar agora + card direito O que mudou com releases do GitHub)

## Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.12.exe` (5.36 MB, SHA-256 `9B41F9CA348AEF1C886E8D2D3379BC1DA9ED12D70EB3B43987A7A3BFCD7BF2D7`)
- `resources.neu` (7.58 MB)
- `update.json` no GH Pages apontando pra v0.2.12
- `README.md` no repo com link direto pro Setup.exe

## Notas tecnicas

- **Backup via `copy /Y` do Windows**: confiavel pra binario (vs `Neutralino.filesystem.writeFile` que grava 0 bytes pra Uint8Array — bug conhecido da v0.2.10).
- **Auto-backup no boot**: fire-and-forget no `app.js` (linha 233). Se a config auto ta ligada e ja passou o intervalo, cria backup. NUNCA bloqueia o boot.
- **Retencao**: roda em paralelo com o auto-backup, removendo arquivos `.db` antigos alem de marcar como `excluido` na tabela.
- **Restaurar backup**: fluxo `pre-restore` (cria backup do banco atual antes de sobrescrever) garante que SEMPRE existe um ponto de retorno.
- **Schema evoluiu**: `CREATE TABLE IF NOT EXISTS backups (...)` roda automaticamente no boot via `migrar()` do `db.js`. Idempotente, sem dor de cabeca.
