# Gestor Inteligente de Demandas

> Produto pessoal de gestão de tarefas, compromissos, projetos e entregas.
> Multi-dispositivo, offline-first.
> Stack: **JavaScript + Neutralino + sql.js + WebView2 + NSIS**.

## Download e instalação

**Última versão (Latest):** [v0.2.11](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.11)

Baixe o arquivo **`GestorInteligenteDeDemandas-Setup-X.Y.Z.exe`** da release mais recente:

**[Download direto do Setup.exe (v0.2.11)](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.11/GestorInteligenteDeDemandas-Setup-0.2.11.exe)**
(Windows 10/11, ~5.4 MB, zero dependência extra)

Execute o instalador. Ele:
- Detecta instalação anterior via registry e atualiza in-place
- Cria atalhos no Menu Iniciar e na Área de Trabalho
- Registra em "Adicionar/Remover Programas"
- Preserva o banco local em `%APPDATA%\GestorInteligenteDeDemandas\`

> **Nota:** o instalador é assinado digitalmente? Ainda não (estamos estudando). Se o Windows SmartScreen bloquear ("Proteção Microsoft Defender SmartScreen impediu...", clique em "Mais informações" → "Executar mesmo assim").

> **Outra nota:** os outros 2 assets da release (`resources.neu` e `RELEASE-NOTES-v0.2.X.md`) **NÃO SÃO O INSTALADOR** — `resources.neu` é só o bundle de auto-update do app já instalado. Baixe **APENAS** o `Setup.exe`.

## Especificação técnica

- `PADRAO-ML-LOPES-DESIGN.md` — stack, processo, armadilhas
- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` — escopo funcional
- `docs/01-07-*.md` — modelo de domínio, dados, contratos, sync, threat, notificações, instalação
- `docs/MATRIZ-RASTREABILIDADE.md` — requisito → implementação → teste
- `GRAPHIFY.md` — mapa técnico gerado por `node tools/graphify.mjs`

## Como rodar em dev

```powershell
# Setup ambiente
. .\tools\setup-env.ps1

# Rodar testes
node tools/run-tests.mjs

# Build (gera dist\GestorInteligenteDeDemandas\)
node tools/build.mjs

# Gerar GRAPHIFY.md
node tools/graphify.mjs
```

## Estrutura

```
src/
  index.html
  css/app.css
  js/
    app.js            ← api() gateway
    telas/            ← hoje, inbox, ...
    vendor/           ← sql-wasm.js, neutralino.js
    backend/
      servidor.js     ← canal → core/*
      db.js           ← sql.js wrapper
      permissoes.js
      ambiente.js
      core/           ← regras puras
schema.sql             ← fonte de verdade do banco
tests/                  ← Node + better-sqlite3
tools/                  ← build, tests, NSIS, GRAPHIFY
installer/              ← NSIS .nsi
.github/workflows/      ← CI
```

## Tamanho esperado

| Artefato | Tamanho |
|---|---|
| `GestorInteligenteDeDemandas.exe` (app-image) | ~2.5 MB |
| `Setup.exe` (instalador) | ~5.4 MB |
| `resources.neu` (bundle) | ~7.5 MB (JS+HTML+CSS+wasm+imagens) |
| Requisitos na máquina | nenhum (WebView2 já vem no Windows 10/11) |

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
