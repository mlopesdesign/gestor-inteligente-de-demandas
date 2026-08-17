# Manual de Instalação — Gestor Inteligente de Demandas

> Versão 0.2.14 — 17/08/2026
> Custo total: **R$ 0,00** (grátis, sem certificado, sem assinatura digital)

---

## 1. Requisitos

| Item | Mínimo |
|---|---|
| Sistema | Windows 10 ou Windows 11 (64 bits) |
| RAM | 2 GB (recomendado 4 GB) |
| Disco | 100 MB livres |
| Permissões | Usuário com direito de instalar programas (admin) |
| Internet | Necessária apenas no download (uso é 100% offline) |

**Não precisa de:**
- Java, .NET, Python, Node.js ou qualquer runtime
- WebView2 (já vem no Windows 10/11 desde 2022)
- Conta em qualquer serviço online
- Cartão de crédito ou cadastro

---

## 2. Download do instalador (3 opções)

Escolha a opção que melhor se adapta ao seu caso:

### Opção A — Setup.exe direto (recomendado se o Windows NÃO bloquear)

Acesse pelo navegador:

```
https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/latest
```

Clique no asset **`GestorInteligenteDeDemandas-Setup-X.Y.Z.exe`** para baixar (5 a 6 MB).

> **Atenção:** ignore os outros 2-3 assets da mesma página:
> - `resources.neu` = bundle de atualização (NÃO serve pra instalar do zero)
> - `RELEASE-NOTES-X.Y.Z.md` = anotações da versão (só pra leitura)
> - `instalar-windows.bat` = instalador alternativo (use a Opção B)
> - `MANUAL-INSTALACAO.pdf` e `GUIA-PRATICO.pdf` = estes manuais (que você já está lendo)

### Opção B — `instalar-windows.bat` (recomendado se o Windows BLOQUEAR o Setup.exe)

Se o Windows mostrar **"A proteção Microsoft Defender SmartScreen impediu o início de um aplicativo não reconhecido"**, baixe o script instalador alternativo:

```
https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/latest/download/instalar-windows.bat
```

**Como usar (3 passos):**

1. **Salve** o arquivo `.bat` em qualquer pasta (Área de Trabalho serve)
2. **Clique com botão direito** no arquivo → **"Executar como administrador"**
3. **Aguarde** o script baixar a versão mais recente automaticamente e abrir o instalador

O script faz 3 coisas automaticamente:
- Baixa o `Setup.exe` da versão mais recente direto do GitHub
- Remove o "Mark-of-the-Web" (MotW) via PowerShell `Unblock-File`
- Executa o instalador como administrador

### Opção C — Desbloqueio manual (último recurso)

Se tanto o Setup.exe quanto o `.bat` forem bloqueados pelo SmartScreen:

1. **Localize** o `Setup.exe` que você baixou
2. **Clique com botão direito** nele → **Propriedades**
3. Na aba **Geral**, marque a checkbox **"Desbloquear"** (perto do rodapé, na seção "Segurança")
4. Clique **OK** e dê duplo-clique no `Setup.exe`

OU, na própria tela do SmartScreen:
1. Clique em **"Mais informações"**
2. Clique em **"Executar mesmo assim"**

---

## 3. Instalação

### 3.1. Iniciando o instalador

Após o download (por qualquer uma das 3 opções acima), execute o `Setup.exe` com **botão direito → "Executar como administrador"**.

> Por que precisa de admin? O instalador precisa registrar o atalho no Menu Iniciar e criar pastas em `C:\Program Files\`.

O instalador NSIS vai abrir uma janela como esta:

*(Print do Setup.exe: tela de boas-vindas "Bem-vindo ao instalador do Gestor Inteligente de Demandas 0.2.14")*

### 3.2. Telas do instalador (passo a passo)

**Tela 1 — Bem-vindo:**
- Leia a mensagem
- Clique em **"Avançar"**

**Tela 2 — Licença:**
- Aceite os termos (ou cancele se não concordar)
- Clique em **"Avançar"**

**Tela 3 — Pasta de instalação:**
- Padrão: `C:\Program Files\Gestor Inteligente de Demandas\`
- Não mude a menos que saiba o que está fazendo
- Clique em **"Avançar"**

**Tela 4 — Instalando:**
- Aguarde ~5-10 segundos
- Barra de progresso vai de 0% a 100%

**Tela 5 — Concluído:**
- Deixe marcado "Executar Gestor Inteligente de Demandas"
- Clique em **"Concluir"**

O app vai abrir automaticamente. Você verá a tela de login com o logo MLOPES DEV.

---

## 4. Primeiro acesso

### 4.1. Criar uma conta nova

Na tela de login, clique em **"Criar conta"** (se houver) ou preencha os campos:

- **Email:** o email que você quer usar (ex: `voce@seudominio.com`)
- **Senha:** deixe em branco se quiser entrar sem senha (o app é local, a senha é opcional)

Clique em **"Entrar"** ou **"Criar conta"**.

### 4.2. Conta demo (teste rápido)

Se o app já tem uma conta demo (vem por padrão em algumas versões), faça login com:

- **Email:** `demo@gestor.local`
- **Senha:** (vazio)

A conta demo vem com 5 tarefas de exemplo. Para começar do zero, crie sua conta e apague as tarefas demo em **Configurações → Apagar conta → Criar nova**.

### 4.3. O que aparece depois do login

Você verá a tela **"Hoje"** com 3 grupos de tarefas:
- **Atrasadas** (em vermelho): tarefas com data de vencimento passada
- **Vencendo hoje** (em laranja): tarefas que vencem hoje
- **Esta semana** (em azul): tarefas que vencem nos próximos 7 dias
- **Em andamento** (em azul claro): tarefas marcadas como em execução

> A topbar preta mostra a logo MLOPES DEV à esquerda, "Gestor" em laranja, a versão (ex: "v0.2.14") e a contagem de tarefas ativas no canto direito.

---

## 5. Onde ficam os dados

Todos os dados ficam **no seu computador, em uma pasta local**:

```
C:\Users\SEU_USUARIO\AppData\Roaming\GestorInteligenteDeDemandas\
├── dados\
│   ├── gestor.db           ← banco SQLite (seus dados)
│   └── backups\            ← backups automáticos e manuais
└── logs\                   ← logs de diagnóstico (técnico)
```

Para acessar:
1. Abra o Explorador de Arquivos
2. Na barra de endereço, cole: `%APPDATA%\GestorInteligenteDeDemandas`
3. Pressione Enter

**Importante:**
- Os dados **NUNCA saem do seu computador** (o app é 100% offline)
- Para fazer backup, copie a pasta `dados\` inteira para um HD externo / nuvem
- Para desinstalar e reinstalar em outra máquina, basta copiar a pasta `dados\`

---

## 6. Atualização do app

### 6.1. Atualização automática (recomendado)

O app verifica automaticamente a cada 6 horas se há versão nova. Se houver:

1. Aparece um **aviso** na tela com botão **"Atualizar agora"**
2. Clique nele e o app baixa + instala a nova versão sozinho
3. O app **reinicia** automaticamente

### 6.2. Verificação manual

1. Abra o app
2. Vá em **Configurações** (último item do menu lateral)
3. Clique na aba **"Atualização"**
4. Clique no botão **"Verificar agora"**

Se houver versão nova, aparece o card com botão **"Baixar e instalar"**.

### 6.3. Atualização manual (último recurso)

Se a atualização automática falhar:
1. Baixe o novo `Setup.exe` da release mais recente
2. Execute como administrador
3. O instalador detecta a versão anterior e **atualiza por cima** (seus dados são preservados)

---

## 7. Backup dos dados (manual)

### 7.1. Pelo próprio app (recomendado)

1. Abra o app
2. Vá em **Configurações → aba "Backup"**
3. Clique em **"Fazer backup agora"**
4. O arquivo `gestor-AAAAMMDD-HHMMSS.db` é salvo em `%APPDATA%\GestorInteligenteDeDemandas\dados\backups\`

### 7.2. Backup automático

1. Configurações → aba "Backup"
2. Ligue o toggle **"Backup automático ligado"**
3. Escolha a frequência (Diária / Semanal / A cada abertura)
4. Defina quantos backups manter (padrão: 30)

### 7.3. Backup manual via Windows Explorer

1. Feche o app
2. Copie a pasta `%APPDATA%\GestorInteligenteDeDemandas\dados\` inteira
3. Cole em outro lugar (HD externo, OneDrive, Google Drive, etc)

Para restaurar, basta colar a pasta de volta.

---

## 8. Desinstalação

### 8.1. Desinstalação normal

1. **Configurações do Windows → Aplicativos → Aplicativos instalados**
2. Procure por **"Gestor Inteligente de Demandas"**
3. Clique em **"Desinstalar"**
4. Confirme

O Windows pergunta se quer apagar os dados em `%APPDATA%\GestorInteligenteDeDemandas\`:
- **Sim** = apaga tudo (irreversível, perde todas as tarefas/projetos)
- **Não** = mantém os dados para reinstalar depois

### 8.2. Desinstalação manual (último recurso)

1. Feche o app
2. Apague a pasta `C:\Program Files\Gestor Inteligente de Demandas\`
3. (Opcional) Apague `%APPDATA%\GestorInteligenteDeDemandas\` se quiser remover tudo
4. (Opcional) Apague os atalhos em `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Gestor Inteligente de Demandas\` e na Área de Trabalho

---

## 9. Solução de problemas

### 9.1. Windows SmartScreen bloqueia o instalador

**Sintoma:** "A proteção Microsoft Defender SmartScreen impediu..."

**Causa:** O app é novo e não tem certificado de assinatura digital pago. É um aviso padrão do Windows para qualquer `.exe` novo.

**Solução:** Use o `instalar-windows.bat` (Opção B) ou desbloqueie manualmente (Opção C). Veja a seção 2 acima.

### 9.2. "Erro de certificado" ou "Publisher não confiável"

Mesma causa do item 9.1. Use a Opção B ou C.

### 9.3. App não abre / fica em "Carregando Gestor..."

**Causas possíveis:**
- Cache do WebView2 corrompido
- Várias instâncias rodando
- Banco de dados corrompido

**Solução:**
1. Feche TODAS as instâncias do app (inclusive o ícone na bandeja do sistema)
2. Abra o Explorador de Arquivos
3. Cole na barra de endereço: `%APPDATA%\GestorInteligenteDeDemandas.exe\EBWebView`
4. Apague tudo dentro dessa pasta (especialmente as subpastas `Default\Cache`, `Default\Code Cache`, `Default\Local Storage`)
5. Abra o app novamente

### 9.4. Esqueci a senha

**Causa:** O app é local. Se você cadastrou com senha e esqueceu:

**Solução:**
1. Feche o app
2. Vá em `%APPDATA%\GestorInteligenteDeDemandas\dados\`
3. **Renomeie** `gestor.db` para `gestor.db.bak` (backup de segurança)
4. Abra o app (ele vai criar um banco novo vazio)
5. Crie uma nova conta
6. **Apague** o `gestor.db.bak` se não quiser os dados antigos

> **Atenção:** renomear o banco apaga o acesso aos dados antigos. Se quiser recuperá-los depois, mantenha o `.bak` e use o app **Configurações → Backup → Restaurar**.

### 9.5. "O instalador não roda como administrador"

**Sintoma:** Duplo-clique no Setup.exe e nada acontece, ou erro "Acesso negado".

**Solução:** Botão direito no `Setup.exe` → "Executar como administrador".

---

## 10. Próximos passos

Depois de instalado, leia o **Guia Prático de Uso** (`GUIA-PRATICO.pdf` ou `GUIA-PRATICO.md`) para aprender a:
- Criar tarefas, projetos, clientes e áreas
- Usar o sistema de cobrança automática
- Configurar backup automático
- Sincronizar entre dispositivos (em breve)

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Versão 0.2.14 — 17/08/2026*
