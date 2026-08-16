# Gestor Inteligente de Demandas v0.2.2

**Icones, schema fix, melhor mensagem de erro.**

## O que mudou

### Icones
- Icone customizado do app (checklist em fundo laranja) gerado e usado em:
  - Janela do app
  - Atalho do Menu Iniciar
  - Atalho do Desktop
  - "Adicionar/Remover Programas"
  - Bandeja do sistema
- Icones emoji no menu lateral (Hoje, Caixa de entrada, Tarefas, etc)

### Bug fix critico (schema)
- Tabela `tarefas` ganhou colunas que o codigo usa mas o schema antigo nao tinha:
  - `cancelada_em`, `cancelada_motivo`
  - `adiada_ate`, `adiada_motivo`
  - `recorrencia_tipo`, `recorrencia_data_base`
- O `INSERT INTO tarefas (...)` da funcao `criar()` falhava com "no such column" porque o schema v0.2.1 estava incompleto
- v0.2.2 corrige isso. Banco do Marcio foi dropado e recriado (nao tinha dados importantes ainda)

### Melhoria de UX
- Tela "Hoje" agora mostra o erro COMPLETO (codigo + mensagem) em vez de so' "Erro: "
- Inclui instrucao de como ver o log pra debug

## Feedback do Marcio (proximo ciclo)

- **Notificacoes**: o Marcio quer **toast** (ja tem) e **WhatsApp** pra ser lembrado das tarefas. WhatsApp vai precisar de feature maior (integracao com API ou WhatsApp Web via n8n). Anotado pra proxima sprint.

## Como atualizar

1. Feche o app se estiver aberto
2. Rode `GestorInteligenteDeDemandas-Setup-0.2.2.exe` como Administrador (UAC)
3. O instalador substitui a v0.2.1
4. Abre o app pelo atalho (agora com icone custom)

## Tamanho
- Setup.exe: 1.9 MB (era 1.1 MB - maior por causa do .ico com 6 tamanhos)
- resources.neu: 930 KB

## SHA256
Ver `sha256sums.txt`.
