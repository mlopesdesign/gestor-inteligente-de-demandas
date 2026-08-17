# Gestor Inteligente de Demandas

> Produto pessoal de gestão de tarefas, compromissos, projetos e entregas.
> Multi-dispositivo, offline-first.
> Stack: **JavaScript + Neutralino + sql.js + WebView2 + Inno Setup**.

## Download e instalação

**Última versão (v0.2.19):** https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.19

### Setup.exe (única opção, padrão Windows)

Baixe o arquivo **`GestorInteligenteDeDemandas-Setup-0.2.19.exe`** da release:

**[Download direto do Setup.exe (v0.2.19, 7.25 MB)](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.19/GestorInteligenteDeDemandas-Setup-0.2.19.exe)**

Dê duplo-clique e instale. O instalador:
- Detecta instalação anterior e atualiza in-place
- Cria atalhos no Menu Iniciar (opcional: Área de Trabalho)
- Preserva o banco local em `%APPDATA%\GestorInteligenteDeDemandas\`
- Não pede administrador (instala em `%LOCALAPPDATA%\Programs\`)
- Windows 10/11 (qualquer build atualizado)

> **Os outros 2 assets da release** (`resources.neu` e `RELEASE-NOTES-v0.2.19.md`) **NÃO SÃO O INSTALADOR** — `resources.neu` é só o bundle de auto-update do app já instalado. Baixe **APENAS** o `Setup.exe`.

### Se o Windows bloquear com SmartScreen

Como o instalador não tem certificado de assinatura digital pago, o **Microsoft Defender SmartScreen** pode mostrar o aviso azul ("A proteção Microsoft Defender SmartScreen impediu o início de um aplicativo não reconhecido") na primeira vez que alguém baixa. Isso é padrão pra qualquer `.exe` sem certificado.

Para destravar:
1. Na tela azul do SmartScreen, clique em **"Mais informações"**
2. Clique em **"Executar mesmo assim"**
3. Pronto, instala normal. Nas próximas vezes o Windows já conhece o app e não pergunta mais.

---

## Especificação técnica

- `PADRAO-ML-LOPES-DESIGN.md` — stack, processo, armadilhas
- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` — escopo funcional
- `docs/01-07-*.md` — modelo de domínio, dados, contratos, sync, threat, notificações, instalação
- `docs/MATRIZ-RASTREABILIDADE.md` — requisito → implementação → teste
- `GRAPHIFY.md` — mapa técnico gerado por `node tools/graphify.mjs`

## Como rodar em dev

```powershell
# Build (gera dist\GestorInteligenteDeDemandas\)
node tools\build.mjs

# Gera o Setup.exe (Inno Setup)
& tools\innosetup7\ISCC.exe installer\gestor.iss

# Roda testes
node tools\run-tests.mjs

# Gera GRAPHIFY.md
node tools\graphify.mjs
```

## Estrutura

```
src/                       ← HTML + CSS + JS (entregue no app)
  index.html
  css/app.css
  js/
    app.js                 ← api() gateway
    telas/                 ← hoje, tarefas, projetos, clientes, areas, busca, configuracoes
    vendor/                ← sql-wasm.js, neutralino.js
    backend/
      servidor.js          ← canal → core/*
      db.js                ← sql.js wrapper
      permissoes.js
      ambiente.js
      core/                ← regras puras
schema.sql                 ← fonte da verdade do banco
tests/                     ← Node + better-sqlite3
tools/                     ← build, tests, innosetup7 (gitignored), GRAPHIFY
installer/
  gestor.iss               ← Inno Setup script
  installer/resources/     ← icon.ico, etc
```

## Tamanho esperado

| Artefato | Tamanho |
|---|---|
| `GestorInteligenteDeDemandas.exe` (app) | ~2.5 MB |
| `Setup.exe` (instalador) | ~7.3 MB |
| `resources.neu` (bundle) | ~7.5 MB |
| Requisitos na máquina | nenhum (WebView2 já vem no Windows 10/11) |

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
