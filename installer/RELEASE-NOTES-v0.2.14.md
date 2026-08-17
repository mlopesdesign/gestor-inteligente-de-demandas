# v0.2.14 - 2026-08-17

## >>> DOWNLOAD DO INSTALADOR <<<

**LINK DIRETO DO SETUP.EXE (v0.2.14, ~5.4 MB):**

**https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.14/GestorInteligenteDeDemandas-Setup-0.2.14.exe**

> **ATENCAO** — os outros 3 assets (`resources.neu`, `RELEASE-NOTES-v0.2.14.md`, `instalar-windows.bat`) NAO SAO o instalador principal. O `resources.neu` e' so bundle de auto-update. O `instalar-windows.bat` e' uma ALTERNATIVA (ver abaixo).

## Novidade

- **`instalar-windows.bat`** (NOVO asset): script que faz bypass automatico do SmartScreen do Windows. Baixa a versao Latest do Setup.exe, remove o "Mark-of-the-Web" (MotW) via `Unblock-File` do PowerShell, e executa o instalador como admin. **Resolve 90% dos bloqueios do SmartScreen**.

**Download:** [instalar-windows.bat](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/latest/download/instalar-windows.bat)

**Como o usuario usa (3 passos):**
1. Salva o `.bat` em qualquer pasta
2. Botao direito -> "Executar como administrador"
3. Aguarda o script baixar e abrir o instalador

## Por que o Windows bloqueia?

O **Microsoft Defender SmartScreen** bloqueia QUALQUER `.exe` novo sem certificado de assinatura digital. Como o projeto e' novo e nao tem certificado ainda, o Windows mostra "A protecao Microsoft Defender SmartScreen impediu o inicio de um aplicativo nao reconhecido" pra todo mundo que baixa pela primeira vez. **Nao significa que o arquivo e' malicioso** - e' um aviso padrao do Windows.

A solucao definitiva (100% sem bloqueio) e' comprar um **certificado de assinatura de codigo** (EV Code Signing) e assinar todos os `.exe` antes de publicar. Custo: ~R$ 1.000-2.500/ano.

## 3 opcoes de download/instalacao (escolha a melhor pro seu caso)

### Opcao 1: Setup.exe direto (recomendado)
Pra quem NAO tem bloqueio. Clique direto, instala.

### Opcao 2: instalar-windows.bat (recomendado pra quem ta' com bloqueio)
Baixa o script, executa como admin. Bypass automatico.

### Opcao 3: Desbloqueio manual (ultimo recurso)
Botao direito no Setup.exe -> Propriedades -> "Desbloquear" no rodape. OU na tela do SmartScreen: "Mais informacoes" -> "Executar mesmo assim".

## Validacao visual

Sem mudancas visuais (v0.2.14 e' so tooling de instalacao). Topbar preta com logo maior continua da v0.2.13.

## Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.14.exe` (5.36 MB, SHA-256 `03BED7AA6735BBA1CFE671E3E61804A24876C439ACF2B24326D295D74F2DD1AF`)
- `instalar-windows.bat` (2.7 KB, SHA-256 `3279129A6390EAC34AB4D11290B0730ADB95C787280BE9A081ADEC49AB62E8EA`) - **NOVO**
- `resources.neu` (7.58 MB)
- `update.json` no GH Pages apontando pra v0.2.14
- `README.md` atualizado com 3 opcoes de download
