# Manual de Instalação — Gestor Inteligente de Demandas v0.1.0

> Identidade imutável: `applicationId = app.mllopes.gestor`
> Caminho de instalação: `%APPDATA%/GestorInteligenteDeDemandas/`

---

## Visão geral

O Gestor Inteligente de Demandas é um aplicativo **Windows nativo**, escrito em
Java 21 LTS, distribuído como **app-image** (JRE 21 embutido) com instalador
gerado via `jpackage`. Não requer Java instalado no sistema.

Há 3 formas de instalar:

| Forma | Arquivo | Tamanho | Quando usar |
|---|---|---|---|
| **ZIP portátil** | `GestorInteligenteDeDemandas-<versao>-win-x64.zip` | ~61 MB | Testar sem instalar; rodar de pen-drive |
| **Setup.exe (NSIS)** | `GestorInteligenteDeDemandas-Setup-<versao>.exe` | ~62 MB | Instalar formalmente (gera atalhos + Adicionar/Remover Programas) |
| **App-image** | `GestorInteligenteDeDemandas/` | ~120 MB | Build local de desenvolvimento |

> No MVP (v0.1.0) ainda não há Setup.exe com NSIS. A entrega atual é **ZIP portátil**
> + atalho criado manualmente. NSIS está previsto para a v0.1.1.

---

## Requisitos

- **Windows 10** versão 1809+ ou **Windows 11**
- **Sem Java pré-instalado** (o JRE vem embutido no ZIP)
- 200 MB livres em disco para o app + dados
- Para sincronização: acesso à internet (HTTPS) ao servidor central
- Opcional: **OpenAI API key** se quiser usar os recursos de IA (sem ela, app usa heurística local)

---

## Instalação via ZIP portátil (recomendada)

### 1. Baixar
Acesse a página de releases:
```
https://github.com/ml-lopes/gestor-inteligente-de-demandas/releases
```
Baixe o asset `GestorInteligenteDeDemandas-0.1.0-win-x64.zip`.

### 2. Conferir integridade
Antes de extrair, verifique o hash SHA-256:

**PowerShell**:
```powershell
Get-FileHash .\GestorInteligenteDeDemandas-0.1.0-win-x64.zip -Algorithm SHA256
```

Compare o resultado com o valor em `sha256sums.txt` da mesma release.

### 3. Extrair
Extraia o conteúdo para uma pasta permanente, **evitando caminhos com espaços
ou caracteres acentuados**:

```
C:\Program Files\GestorInteligenteDeDemandas\
├── GestorInteligenteDeDemandas.exe   ← launcher
├── runtime\                          ← JRE 21 embutido
└── app\                              ← código + recursos
```

### 4. Criar atalho (opcional)
Clique com o botão direito em `GestorInteligenteDeDemandas.exe` →
*Enviar para* → *Área de trabalho (criar atalho)*.

Para fixar no Menu Iniciar:
```
Botão direito no .exe → Fixar no Início
```

### 5. Primeiro lançamento
- **SmartScreen**: Windows pode mostrar "O Windows protegeu seu computador".
  Clique em *Mais informações* → *Executar mesmo assim*. Isso acontece porque
  o MVP não tem certificado Authenticode (planejado para v0.2.x).
- O app cria a pasta `%APPDATA%\GestorInteligenteDeDemandas\` no primeiro
  uso, com `gestor_local.db` (banco SQLite local).
- O app aparece na bandeja do sistema (ícone ao lado do relógio). Fechar a
  janela = esconder para a bandeja. Para sair de verdade: menu da bandeja → *Sair*.

---

## Configuração do servidor central (opcional)

Por padrão, o app **funciona 100% offline**. Para habilitar sincronização entre
dispositivos, configure o servidor:

1. Levante o servidor (Java 21):
   ```bash
   java -jar server-0.1.0.jar
   ```
2. No app desktop, edite `%APPDATA%\GestorInteligenteDeDemandas\config.json`:
   ```json
   {
     "servidor_url": "https://gestor.exemplo.com",
     "auto_sync": true,
     "intervalo_sync_segundos": 60
   }
   ```
3. Reinicie o app. Ele vai pedir login/cadastro na primeira conexão.

> **LGPD**: o servidor central guarda seu email e hash de senha (argon2id).
> Nenhuma tarefa é enviada sem login. Você pode exportar ou apagar todos os
> dados via *Configurações → Conta → Exportar / Apagar*.

---

## Configuração da IA (opcional)

Para usar a IA (parse de texto livre, sugestões):

1. Obtenha uma API key em <https://platform.openai.com/api-keys>
2. No servidor, defina a variável de ambiente `OPENAI_API_KEY`:
   ```bash
   # Windows
   setx OPENAI_API_KEY sk-...
   ```
3. Reinicie o servidor. O endpoint `/api/v1/ai/status` deve retornar
   `"disponivel": true`.

Sem a chave, o app usa **heurística local** (sem custo, sem dados saindo da máquina).

---

## Atualização

O app verifica updates a cada 6h. Quando há versão nova:
- Notificação na bandeja: *"Nova versão 0.1.1 disponível"*
- Botão *Atualizar agora* baixa o ZIP, valida SHA-256, faz backup do
  banco local e substitui os binários
- Reinício automático

Para forçar: menu da bandeja → *Verificar atualizações*.

---

## Desinstalação

1. Menu da bandeja → *Sair* (fecha o app)
2. Apague a pasta de instalação (`C:\Program Files\GestorInteligenteDeDemandas\`)
3. **Opcional**: apague `%APPDATA%\GestorInteligenteDeDemandas\` para remover
   também o banco local
4. Atalho da área de trabalho: remova manualmente

> Para desinstalar e **apagar TODOS os dados** (LGPD): use *Configurações → Conta →
> Apagar conta* antes de desinstalar. Isso remove do servidor central e do banco local.

---

## Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Aplicação não foi possível iniciar" | SmartScreen bloqueando | *Mais informações → Executar* |
| App abre mas não lista tarefas | Banco local vazio | Crie uma tarefa pelo botão *Nova* |
| Sync não funciona | Servidor inacessível | Verifique `config.json` + conexão |
| Notificações não aparecem | Modo "Não Perturbe" do Windows | Desative em *Configurações → Sistema → Foco* |
| Performance lenta | Banco grande (>50k tarefas) | Use *Arquivar concluídas* no menu |

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
