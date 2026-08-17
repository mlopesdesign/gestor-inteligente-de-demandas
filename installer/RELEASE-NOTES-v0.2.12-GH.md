## v0.2.12 - Aba Backup em Configuracoes (manual + automatico)

### >>> DOWNLOAD DIRETO DO INSTALADOR <<<

**Setup.exe (5.36 MB, Windows 10/11, zero dependencia):**

**https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.12/GestorInteligenteDeDemandas-Setup-0.2.12.exe**

Os outros 2 assets (`resources.neu` e este release notes) **NAO SAO O INSTALADOR**. O `resources.neu` e' so o bundle de auto-update do app ja instalado.

### Novidades

- **Nova aba Backup em Configuracoes** (estilo Salgueiro, 3 abas: **Geral** | **Backup** | **Atualizacao**):
  - **Backup manual**: botao "Fazer backup agora" copia o banco SQLite pra `%APPDATA%\GestorInteligenteDeDemandas\dados\backups\gestor-YYYYMMDD-HHMMSS.db` via `copy /Y` do Windows.
  - **Backup automatico**: toggle + frequencia (diaria / semanal / a cada abertura) + retencao (ultimos N). Hook no boot cria backup se ja passou o intervalo.
  - **Historico**: lista todos os backups com data, tamanho, origem. Clique pra ver detalhes + botoes "Restaurar" e "Excluir".
  - **Restaurar backup**: cria backup de seguranca (pre-restore) antes de copiar o backup selecionado sobre o banco. Reinicia o app.
  - **Excluir backup**: remove o arquivo do disco + marca como `excluido` na tabela.
- **README no GitHub** com link direto pro Setup.exe.

### Tabela nova

`backups (id, criado_em, caminho, tamanho_bytes, origem, observacao, sha256, status)` - criada via `CREATE TABLE IF NOT EXISTS` no schema.sql, idempotente.

### Rotas novas

`backup:criar`, `backup:listar`, `backup:restaurar`, `backup:excluir`, `backup:obterAuto`, `backup:salvarAuto`, `backup:aplicarAuto`.

### Validacao visual

Todas as 7 telas + 3 telas de Config (Geral/Backup/Atualizacao) validadas em v0.2.12. Prints em `docs/FINAL-v0.2.12-*.png`.

### Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.12.exe` (5.36 MB, SHA-256 `9B41F9CA348AEF1C886E8D2D3379BC1DA9ED12D70EB3B43987A7A3BFCD7BF2D7`)
- `resources.neu` (7.58 MB)
- `update.json` no GH Pages apontando pra v0.2.12
