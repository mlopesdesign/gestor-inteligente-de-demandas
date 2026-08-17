## v0.2.15 - Manuais em PDF (gratis)

### >>> DOWNLOAD DIRETO DO INSTALADOR <<<

**Setup.exe (5.36 MB):**

**https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.15/GestorInteligenteDeDemandas-Setup-0.2.15.exe**

### Manuais em PDF (disponiveis como assets desta release)

- **MANUAL-INSTALACAO.pdf** (221 KB): download, instalacao, primeiro acesso, backup, desinstalacao, troubleshooting
- **GUIA-PRATICO.pdf** (249 KB): uso do app, tarefas/projetos/clientes/areas, backup, configuracoes, atalhos, FAQ

Tambem em Markdown no GitHub: `docs/MANUAL-INSTALACAO.md` e `docs/GUIA-PRATICO.md`.

### Sem certificado, sem custo

A opcao de certificado de assinatura digital (que tinha sugerido) foi descartada. Em vez disso, montei documentacao completa em PDF pros clientes. Custo total da release: **R$ 0,00**.

### Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.15.exe` (5.36 MB, SHA-256 `E6B7F2FD0D03030FE483B10D5EC2EB7A1836FE30264CDD9D2AD51ABBE8E51EEA`)
- `instalar-windows.bat` (2.7 KB, SHA-256 `3279129A6390EAC34AB4D11290B0730ADB95C787280BE9A081ADEC49AB62E8EA`)
- **`MANUAL-INSTALACAO.pdf` (221 KB) - NOVO**
- **`GUIA-PRATICO.pdf` (249 KB) - NOVO**
- `resources.neu` (7.58 MB)
- `update.json` no GH Pages apontando pra v0.2.15
- 6 assets na release

### Como gerar/atualizar os PDFs

```powershell
code docs\MANUAL-INSTALACAO.md docs\GUIA-PRATICO.md
node tools\_md-to-pdf.cjs
```

Usa Edge + puppeteer-core (ja vem no Windows). 100% gratis, sem dependencia externa.
