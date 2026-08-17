## v0.2.14 - Bypass automatico do SmartScreen

### >>> DOWNLOAD DIRETO DO INSTALADOR <<<

**Setup.exe (5.36 MB):**

**https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.14/GestorInteligenteDeDemandas-Setup-0.2.14.exe**

### SE O WINDOWS BLOQUEAR (SmartScreen), use este .bat

**instalar-windows.bat (2.7 KB):** [Download](https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/latest/download/instalar-windows.bat)

Botao direito -> Executar como administrador. Ele baixa a versao mais recente, remove o "Mark-of-the-Web" via `Unblock-File` do PowerShell, e executa o instalador.

### Por que o Windows bloqueia?

O **Microsoft Defender SmartScreen** bloqueia QUALQUER `.exe` novo sem certificado de assinatura digital. Como o projeto e' novo e nao tem certificado ainda, o Windows mostra "A protecao Microsoft Defender SmartScreen impediu o inicio de um aplicativo nao reconhecido" pra todo mundo que baixa pela primeira vez. **Nao significa que o arquivo e' malicioso** - e' um aviso padrao.

A solucao definitiva (100% sem bloqueio) e' comprar um **certificado de assinatura de codigo** (EV Code Signing). Custo: ~R$ 1.000-2.500/ano.

### 3 opcoes de instalacao

1. **Setup.exe direto** - pra quem nao tem bloqueio
2. **instalar-windows.bat** (NOVO) - bypass automatico do SmartScreen
3. **Desbloqueio manual** - Propriedades -> "Desbloquear" OU na tela do SmartScreen: "Mais informacoes" -> "Executar mesmo assim"

### Arquivos

- `GestorInteligenteDeDemandas-Setup-0.2.14.exe` (5.36 MB, SHA-256 `03BED7AA6735BBA1CFE671E3E61804A24876C439ACF2B24326D295D74F2DD1AF`)
- `instalar-windows.bat` (2.7 KB, SHA-256 `3279129A6390EAC34AB4D11290B0730ADB95C787280BE9A081ADEC49AB62E8EA`) - **NOVO**
- `resources.neu` (7.58 MB)
- `update.json` no GH Pages apontando pra v0.2.14
