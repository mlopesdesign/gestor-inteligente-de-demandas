# Guia Prático de Uso — Gestor Inteligente de Demandas

> Versão 0.2.14 — 17/08/2026
> Para começar, leia primeiro o **Manual de Instalação** (`MANUAL-INSTALACAO.pdf`).

---

## 1. Visão geral do app

O **Gestor Inteligente de Demandas** tem 6 telas principais no menu lateral esquerdo:

| Tela | Pra quê serve |
|---|---|
| **Hoje** | Visão geral do que tá atrasado, vence hoje, esta semana |
| **Caixa de entrada** | Tarefas que chegaram mas ainda não foram triadas |
| **Tarefas** | Lista completa de todas as tarefas com filtros |
| **Projetos** | Cards dos projetos com contagem de tarefas |
| **Clientes** | Lista de clientes / contatos (4 cadastrados) |
| **Áreas** | Áreas da vida (Trabalho, Pessoal, etc — 3 áreas padrão) |
| **Buscar** | Busca global em todas as entidades |
| **Configurações** | Perfil, backup, atualização, exportar, apagar conta |

A **topbar preta** (no topo) tem:
- **Logo MLOPES DEV** à esquerda
- **"Gestor"** em laranja (nome do app)
- **"v0.2.14"** (versão instalada)
- **"12 tarefas ativas"** em verde no canto direito

---

## 2. Tela "Hoje" — sua central de comando

A tela inicial mostra as tarefas agrupadas em 4 "buckets" (caixas):

### 2.1. Os 4 buckets

- **Atrasadas** (em **vermelho**, com borda esquerda vermelha): tarefas com data de vencimento **passada** e ainda não concluídas
- **Vencendo hoje** (em **laranja**, com borda esquerda laranja): tarefas que vencem **hoje**
- **Esta semana** (em **azul**, com borda esquerda azul): tarefas que vencem nos **próximos 7 dias**
- **Em andamento** (em **azul claro**, com borda esquerda azul claro): tarefas com status `EM_ANDAMENTO`

*(Print da tela Hoje: 12 tarefas ativas em 4 grupos — Atrasadas: 3 / Vencendo hoje: 2 / Esta semana: 2 / Em andamento: 5)*

### 2.2. Ações em cada tarefa

Cada tarefa tem 2 botões no canto direito:
- **"Editar"** (branco): abre o formulário de edição
- **"Concluir"** (verde): marca como concluída (some da lista)

À esquerda, um **círculo colorido** mostra o status:
- **Verde** = concluída
- **Vermelho** = atrasada
- **Amarelo** = prioridade ALTA ou URGENTE

Pílulas coloridas mostram:
- **URGENTE** (vermelho) / **ALTA** (vermelho) / **NORMAL** (azul) / **BAIXA** (verde) = prioridade
- **EM_ANDAMENTO** (azul) / **PLANEJADA** (cinza) = status

### 2.3. Botões do topo

- **"+ Nova tarefa"** (laranja): abre o formulário de criação
- **"Cobrar agora"** (branco): dispara o sistema de cobrança (toast + notificação) das tarefas atrasadas

---

## 3. Criando uma tarefa

### 3.1. Caminho rápido

1. Na tela **Hoje** (ou qualquer outra), clique no botão **"+ Nova tarefa"** no canto superior direito
2. Preencha os campos:
   - **Título** (obrigatório): o que precisa ser feito
   - **Descrição** (opcional): detalhes, contexto, links
   - **Projeto** (opcional): associa a um projeto
   - **Cliente** (opcional): associa a um cliente
   - **Área** (opcional): agrupa por contexto (Trabalho, Pessoal, etc)
   - **Prioridade**: URGENTE / ALTA / NORMAL / BAIXA (padrão: NORMAL)
   - **Vencimento** (opcional): data limite
3. Clique em **"Criar tarefa"** (botão laranja)

### 3.2. Tarefas recorrentes

Se a tarefa se repete (ex: "pagar boleto do cartão toda dia 5"), marque **"Tarefa recorrente"** no formulário. Você pode escolher:
- **Diária** / **Semanal** / **Mensal**
- A cada N dias / semanas / meses

*(Print do formulário de Nova Tarefa com campo de recorrência expandido)*

---

## 4. Criando um projeto

Projeto é um agrupador de tarefas com prazo, cliente e status próprio.

1. Vá em **Projetos** (menu lateral)
2. Clique em **"+ Novo projeto"** (canto superior direito)
3. Preencha:
   - **Título** (obrigatório)
   - **Cliente** (opcional): associa a um cliente
   - **Data início** e **Data fim** (opcional)
   - **Status**: PLANEJADO / EM_ANDAMENTO / CONCLUIDO / CANCELADO
4. Clique em **"Criar projeto"**

Cada projeto aparece como um **card** com:
- Título e status
- Período (datas)
- Contagem: "X tarefa(s) ativa(s) / Y total"
- Botões: Editar / Concluir / Ver tarefas

*(Print da tela Projetos: 4 cards — App IML Mobile, Identidade visual Recanto, Landing page Cacique, Site Cenário Alagoas)*

---

## 5. Criando um cliente

1. Vá em **Clientes** (menu lateral)
2. Clique em **"+ Novo cliente"** (canto superior direito)
3. Preencha:
   - **Nome** (obrigatório)
   - **Organização** (opcional)
   - **Email** / **Telefone** (opcional)
   - **Anotações** (opcional)
4. Clique em **"Criar cliente"**

A tabela de clientes mostra cada um com a contagem de projetos e tarefas ativas vinculadas.

*(Print da tela Clientes: tabela com Ana Paula/Cenário Alagoas, Bruno Costa/Recanto, Carla Mendes/Cacique, Diego Rocha/IML)*

---

## 6. Criando uma área

Área é um agrupador de alto nível (Trabalho, Pessoal, Saúde, etc). Útil pra separar contextos da vida.

1. Vá em **Áreas** (menu lateral)
2. Clique em **"+ Nova área"** (canto superior direito)
3. Preencha:
   - **Nome** (ex: "Trabalho", "Pessoal", "Estudos")
   - **Cor** (para identificação visual rápida)
4. Clique em **"Criar área"**

Cada área mostra a contagem de tarefas ativas dentro dela.

*(Print da tela Áreas: 3 cards — Comercial 2 ativas, Desenvolvimento 4 ativas, Design 4 ativas)*

---

## 7. Sistema de cobrança automática

### 7.1. O que é

O app monitora suas tarefas atrasadas e avisa você periodicamente. Você não precisa abrir o app pra ser lembrado.

### 7.2. Como funciona

- A cada **X minutos** (configurável), o app verifica tarefas atrasadas
- Se houver, abre um **toast** (notificação) no canto inferior direito da tela
- O toast diz **"Você tem N tarefa(s) atrasada(s)"** e some em ~5 segundos
- Você decide se clica em **"Resolver agora"** (vai pra tela Hoje filtrada) ou ignora

### 7.3. Configuração

Vá em **Configurações → aba "Geral" → Tom de cobrança** e escolha:
- **PROFISSIONAL** (padrão): "Tarefa X está atrasada há N dias. Sugerimos priorizá-la hoje."
- **FIRME**: "ATRASADA! Tarefa X precisa de atenção imediata. Não adie mais."
- **GENTIL**: "Oi! Só passando pra lembrar da tarefa X. Sem pressão. :)"

Outros ajustes:
- **Silenciar fora do horário** (não avisa se não estiver em horário de trabalho)
- **Horário de trabalho**: início e fim (padrão 08:00-18:00)

### 7.4. "Cobrar agora" manual

Na tela Hoje, clique em **"Cobrar agora"** (canto superior direito) pra forçar a cobrança de todas as tarefas atrasadas agora.

---

## 8. Backup dos dados

### 8.1. Backup manual (botão)

1. **Configurações → aba "Backup"**
2. Clique em **"Fazer backup agora"**
3. Aparece o tamanho do backup e a data/hora
4. O arquivo vai pra `%APPDATA%\GestorInteligenteDeDemandas\dados\backups\`

### 8.2. Backup automático

1. Configurações → aba "Backup"
2. Ligue o toggle **"Backup automático ligado"**
3. Escolha:
   - **Frequência**: Diária / Semanal / A cada abertura do app
   - **Hora preferida** (informativo, sem agendamento real)
   - **Manter últimos N**: quantos backups manter antes de apagar os antigos (padrão 30)

O backup é criado no boot do app, se já passou o intervalo desde o último.

### 8.3. Restaurar backup

1. Configurações → aba "Backup"
2. No **Histórico de backups** (à direita), clique no backup que quer restaurar
3. Clique em **"Restaurar este backup"**
4. Confirme

> O app **cria um backup de segurança do banco atual** antes de restaurar. Se a restauração der errado, o banco atual pode ser recuperado.

### 8.4. Backup externo (HD, nuvem)

1. Feche o app
2. Abra `%APPDATA%\GestorInteligenteDeDemandas\dados\`
3. Copie o arquivo `gestor.db` para um HD externo, OneDrive, Google Drive, etc
4. Para restaurar, basta colar o `gestor.db` de volta na mesma pasta

> O arquivo `gestor.db` contém TUDO: tarefas, projetos, clientes, áreas, lembretes, auditoria. **Faça backup semanal** se o app é crítico pro seu trabalho.

---

## 9. Busca global

1. Vá em **Buscar** (menu lateral)
2. Digite pelo menos 2 caracteres no campo de busca
3. Os resultados aparecem em tempo real, agrupados por tipo:
   - Tarefas
   - Projetos
   - Clientes
   - Áreas

A busca é case-insensitive e busca em título, descrição, observações, etc.

*(Print da tela Buscar: campo de busca + "Comece a digitar para ver resultados.")*

---

## 10. Configurações

A tela de Configurações tem 3 abas (estilo Salgueiro):

### 10.1. Aba "Geral"

- **Perfil**: nome, email (somente leitura), fuso horário, tom de cobrança
- **Horário de trabalho**: início e fim
- **Silenciar cobrança fora do horário**
- **Estatísticas**: contagem total (12 tarefas, 4 projetos, 4 clientes, 3 áreas)
- **Exportar dados (LGPD)**: baixa um JSON com tudo
- **Apagar conta (LGPD)**: apaga TUDO irreversivelmente (pede confirmação dupla)
- **Sessão**: botão "Sair (logout)"

### 10.2. Aba "Backup"

- **Fazer backup agora** (botão laranja)
- **Backup automático**: toggle, frequência, hora, retenção
- **Histórico**: lista de todos os backups com data, tamanho, origem
- **Restaurar** / **Excluir** (por item)

### 10.3. Aba "Atualização"

- **Versão instalada**: v0.2.14 (ou a sua)
- **Verificar agora** (botão): checa se há versão nova
- **Card "Nova versão disponível"** (quando há): com notas + botão "Baixar e instalar"
- **"O que mudou"** (à direita): lista de versões do GitHub com clique pra detalhes

*(Print da Configuração → Atualização mostrando card esquerdo "Atualização do sistema" + card direito "O que mudou" com versões)*

---

## 11. Atalhos do teclado

| Tecla | Ação |
|---|---|
| `Esc` | Fecha modal aberto |
| `Enter` em campo | Confirma / submete o formulário |
| `Tab` | Navega entre campos |
| `Ctrl + R` | Recarrega o app (use com cuidado — pode perder alterações não salvas) |

---

## 12. Dicas e truques

### 12.1. Use áreas pra separar contextos

Crie 3-5 áreas (Trabalho, Pessoal, Estudos, Saúde, etc) e sempre associe tarefas a uma área. Na tela Hoje, vai ser fácil ver o que tá atrasado em cada contexto.

### 12.2. Use prioridades com moderação

Se TUDO é URGENTE, nada é urgente. Use:
- **URGENTE**: coisas que precisam ser feitas hoje
- **ALTA**: coisas dessa semana
- **NORMAL** (padrão): coisas desse mês
- **BAIXA**: coisas sem pressa

### 12.3. Crie projetos pra agrupar coisas complexas

Se você tem um trabalho com 5+ tarefas relacionadas, crie um projeto. Aí você consegue ver o "progresso" do projeto inteiro (X de Y tarefas concluídas) na tela Projetos.

### 12.4. Faça backup semanal

Configure o backup automático pra rodar 1x por semana. Se o Windows der pau ou você apagar sem querer, o backup tá lá.

### 12.5. Use a busca pra achar tarefas antigas

Em vez de rolar listas enormes, digite 2-3 palavras-chave da tarefa na busca global. O app acha em segundos.

### 12.6. Não use senha (se for só pra você)

O app é local, sem servidor, sem risco de invasão. A senha serve só pra impedir quem compartilha o PC de ver seus dados. Se você é o único usuário, **deixe em branco** — entra com 1 clique.

---

## 13. Esqueci a senha — como recuperar

O app é 100% local, sem email de recuperação. Se você esqueceu a senha cadastrada:

### Opção 1: tem backup recente

1. **Configurações → aba "Backup"** → restaure o backup de ANTES de você perder a senha
2. Pronto, voltou o acesso

### Opção 2: sem backup

1. **Feche** o app
2. Vá em `%APPDATA%\GestorInteligenteDeDemandas\dados\`
3. **Renomeie** `gestor.db` pra `gestor.db.esqueci-senha`
4. Abra o app — vai pedir pra criar uma conta nova (banco vazio)
5. **Crie a conta** com o MESMO email da anterior (o app vai detectar conflito e pedir confirmação)
6. Se você **quiser** manter os dados antigos, o app vai tentar mesclar. Senão, o `gestor.db.esqueci-senha` vira o histórico antigo que pode ser deletado

### Opção 3: nuclear (perde tudo)

1. **Feche** o app
2. **Apague** `gestor.db`
3. Abra o app — cria conta nova do zero

> **Dica:** sempre anote a senha em algum lugar seguro. Ou **não use senha** e marque "Manter conectado" no login (fica 1-clique pra entrar).

---

## 14. Perguntas frequentes

**O app funciona offline?**
Sim, 100%. Não precisa de internet depois de instalado.

**Posso usar em mais de um PC?**
Sim. O app é local, cada PC tem seu próprio banco. Pra sincronizar entre PCs, use a aba **Backup** (copia o arquivo `gestor.db` entre máquinas).

**Meus dados vão pra alguma nuvem?**
Não. Tudo fica no seu PC, em `%APPDATA%`. Nenhum byte sai do seu computador.

**Quanto custa?**
R$ 0,00. Software livre, sem anúncios, sem assinatura, sem pegadinha.

**Como recebo atualização?**
O próprio app avisa quando tem versão nova (toast a cada 6h). Ou vá em **Configurações → Atualização → Verificar agora**.

**Posso desinstalar e reinstalar sem perder dados?**
Sim. Na desinstalação, escolha **"Não"** quando perguntar se quer apagar dados. Na reinstalação, o instalador detecta a versão anterior e atualiza por cima. Seus dados ficam intactos.

**Como reporto um bug?**
Por enquanto, mande email pra **mlopesdesign@gmail.com** com prints do problema e o que estava fazendo.

---

## 15. Próximas funcionalidades

O roadmap (em ordem de prioridade):

- [ ] **Sincronização entre dispositivos** (vai precisar de servidor central — opcional)
- [ ] **Anexos em tarefas** (upload de arquivos)
- [ ] **Tags customizadas** (além de áreas)
- [ ] **Subtarefas** (checklist dentro de tarefa)
- [ ] **App mobile** (Android / iOS, mesma base de código)
- [ ] **Integração com calendário** (Google Calendar, Outlook)
- [ ] **Lembretes por email** (opcional, precisa configurar SMTP)

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Versão 0.2.14 — 17/08/2026*
