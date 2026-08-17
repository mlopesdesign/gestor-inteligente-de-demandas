# v0.2.15 - 2026-08-17

## >>> DOWNLOAD DO INSTALADOR <<<

**LINK DIRETO DO SETUP.EXE (v0.2.15, ~5.4 MB):**

**https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.15/GestorInteligenteDeDemandas-Setup-0.2.15.exe**

> **ATENCAO** — a release tem 6 assets. Baixe **APENAS** o `Setup.exe`. Os outros sao bundle de update, instalador alternativo, ou manuais (que voce ja esta lendo).

## Novidade

- **2 manuais em PDF** disponiveis como assets da release:
  - `MANUAL-INSTALACAO.pdf` (221 KB): download, instalacao, primeiro acesso, backup, desinstalacao, troubleshooting
  - `GUIA-PRATICO.pdf` (249 KB): uso do app, tarefas/projetos/clientes/areas, backup, configuracoes, atalhos, FAQ
  - Tambem disponiveis em Markdown (`MANUAL-INSTALACAO.md`, `GUIA-PRATICO.md`) no GitHub
- **Script de geracao** (`tools/_md-to-pdf.cjs`): converte Markdown em PDF usando Edge + puppeteer-core. **100% gratis**, sem certificado, sem dependencia externa. Basta ter Edge no Windows.

## Por que agora?

Pedido do Marcio: "NADA DE COMPRAR, TUDO TEM QUE TER CUSTO ZERO". Entao a opcao de certificado de assinatura digital (que tinha sugerido) foi descartada. Em vez disso, montei documentacao completa + manual pratico em PDF pros clientes nao terem duvidas na instalacao e no uso.

## Validacao visual

Sem mudancas no app (e' so documentacao). Topbar preta com logo MLOPES DEV maior continua da v0.2.13.

## Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.15.exe` (5.36 MB, SHA-256 `E6B7F2FD0D03030FE483B10D5EC2EB7A1836FE30264CDD9D2AD51ABBE8E51EEA`)
- `instalar-windows.bat` (2.7 KB, SHA-256 `3279129A6390EAC34AB4D11290B0730ADB95C787280BE9A081ADEC49AB62E8EA`)
- **`MANUAL-INSTALACAO.pdf` (221 KB, SHA-256 vem do sha256sums.txt) - NOVO**
- **`GUIA-PRATICO.pdf` (249 KB, SHA-256 vem do sha256sums.txt) - NOVO**
- `resources.neu` (7.58 MB)
- `update.json` no GH Pages apontando pra v0.2.15
- 6 assets na release (Setup.exe + .bat + 2 PDFs + .neu + release notes)

## Como gerar/atualizar os PDFs (pra proxima versao)

```powershell
# Editar os .md em docs/
code docs\MANUAL-INSTALACAO.md docs\GUIA-PRATICO.md

# Regenerar os PDFs
node tools\_md-to-pdf.cjs

# Sobe junto com o proximo release
```
