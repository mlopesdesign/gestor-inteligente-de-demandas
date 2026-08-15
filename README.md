# Gestor Inteligente de Demandas

> Produto pessoal de gestão de tarefas, compromissos, projetos e entregas.
> Multi-dispositivo, offline-first.
> Stack: **JavaScript + Neutralino + sql.js + WebView2 + NSIS**.

## Especificação

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

## Como instalar (cliente)

Baixe o `GestorInteligenteDeDemandas-Setup-0.1.0.exe` da release
e execute. O instalador:

- Detecta instalação anterior via registry e atualiza in-place
- Cria atalhos no Menu Iniciar e na Área de Trabalho
- Registra em "Adicionar/Remover Programas"
- Preserva o banco local em `%APPDATA%\GestorInteligenteDeDemandas\`

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
| `GestorInteligenteDeDemandas.exe` (app-image) | ~3 MB |
| `Setup.exe` (instalador) | ~3-4 MB |
| `resources.neu` (bundle) | ~200 KB (JS+HTML+CSS+wasm) |
| Requisitos na máquina | nenhum (WebView2 já vem no Windows 10/11) |

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
