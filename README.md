# Gestor Inteligente de Demandas

> Produto pessoal de gestão de tarefas, compromissos, projetos e entregas.
> Multi-dispositivo, offline-first.
> Stack: **JavaScript + Neutralino + sql.js + WebView2 + NSIS**.

## Download e instalação

**Última versão (Latest):** [v0.2.13](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.13)

### Opção 1: Setup.exe direto (recomendado pra você)

Baixe o arquivo **`GestorInteligenteDeDemandas-Setup-0.2.13.exe`** da release mais recente:

**[Download direto do Setup.exe (v0.2.13, ~5.4 MB)](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.13/GestorInteligenteDeDemandas-Setup-0.2.13.exe)**
(Windows 10/11, zero dependência extra)

Execute o instalador. Ele:
- Detecta instalação anterior via registry e atualiza in-place
- Cria atalhos no Menu Iniciar e na Área de Trabalho
- Registra em "Adicionar/Remover Programas"
- Preserva o banco local em `%APPDATA%\GestorInteligenteDeDemandas\`

> **ATENÇÃO:** os outros 2 assets da release (`resources.neu` e `RELEASE-NOTES-v0.2.X.md`) **NÃO SÃO O INSTALADOR** — `resources.neu` é só o bundle de auto-update do app já instalado. Baixe **APENAS** o `Setup.exe`.

### Opção 2: `instalar-windows.bat` (recomendado pra quem tá com bloqueio)

Se o **Windows SmartScreen bloquear o Setup.exe** (mensagem "A proteção Microsoft Defender SmartScreen impediu o início de um aplicativo não reconhecido..."), use este script que faz o bypass automático:

**[Download do instalar-windows.bat](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/latest/download/instalar-windows.bat)**

**Como usar (3 passos):**
1. **Salve** o `.bat` em qualquer pasta (Área de Trabalho, por exemplo)
2. **Clique com botão direito** no arquivo → **"Executar como administrador"**
3. **Aguarde** ele baixar a versão mais recente e abrir o instalador

O script faz 3 coisas automaticamente:
- Baixa o `Setup.exe` da release Latest (sempre a mais nova)
- Remove o "Mark-of-the-Web" (MotW) via `Unblock-File` do PowerShell (isso desbloqueia o SmartScreen)
- Executa o instalador como administrador

Se mesmo assim o PowerShell bloquear, abra o PowerShell como admin e rode:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
irm https://raw.githubusercontent.com/mlopesdesign/gestor-inteligente-de-demandas/main/installer/instalar-windows.ps1 | iex
```

### Opção 3: Desbloquear manualmente (último recurso)

Se nenhuma das opções acima funcionou:

1. Clique com botão direito no `Setup.exe` → **Propriedades**
2. Na aba **Geral**, marque a checkbox **"Desbloquear"** (perto do rodapé: "Segurança: Este arquivo veio de outro computador...")
3. Clique **OK** e dê duplo-clique no `Setup.exe`

OU, quando aparecer a tela do SmartScreen:
1. Clique em **"Mais informações"**
2. Clique em **"Executar mesmo assim"**

---

## Por que o Windows bloqueia o instalador?

O **Microsoft Defender SmartScreen** bloqueia qualquer `.exe` novo que ainda não acumulou "reputação" no Windows. Como esse projeto é novo e não tem certificado de assinatura digital, o Windows mostra o aviso pra qualquer pessoa que baixar. É um aviso de **precaução padrão**, não significa que o arquivo é malicioso.

A solução definitiva (100% sem bloqueio) é comprar um **certificado de assinatura de código** (EV Code Signing) e assinar todos os `.exe` antes de publicar. Custo: ~R$ 1.000-2.500/ano. Sem isso, o aviso vai aparecer pra todo mundo que baixar pela primeira vez.

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
installer/              ← NSIS .nsi + instalar-windows.bat
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
