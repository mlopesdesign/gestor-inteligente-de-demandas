# ADR 0004 — Gateway de IA isolado no servidor, prompts versionados

> **Vinculante.** Precedência #3.
> Decidido em 14/08/2026 (Fase 0).
> **Revisão 1 (mesmo dia):** stack migrada para Java. Esta ADR passa a usar o SDK oficial **`openai-java`** no servidor. Princípios permanecem.

---

## Status

Aceito — **revisão 1** substitui a versão Node (`openai@^4`).

## Contexto

PROJETO §13 (inalterado):

- IA interpreta linguagem natural, propõe estrutura, decompor entregas, sugerir ordem, detectar sobrecarga, sugerir prazos intermediários, resumir pendências, identificar tarefas vagas, redigir cobranças contextuais, responder perguntas sobre dados.
- Limites:
  - IA não conclui, exclui, cancela, altera prazo silenciosamente.
  - IA não é fonte única de regras.
  - Resultados estruturados validados por esquema.
  - Indisponibilidade da API não impede funcionamento essencial.
  - Chave da API no servidor.
  - Chamadas, custos, falhas com telemetria.
  - IA desligável.
- API OpenAI oficial, structured outputs e function calling quando aplicável.
- Prompts de produção versionados e testados; mudanças com histórico e critérios de regressão.

Padrão ML Lopes §1 (cliente sem dependência runtime) — Java: cliente não tem SDK OpenAI, chave jamais no JAR distribuído.

## Decisão

### Isolamento

- **Cliente** (desktop JavaFX e web estática) **nunca** carrega SDK da OpenAI. Verificado por `grep` no build (`tools/check-no-openai-on-client.mjs` ou equivalente Java).
- **Servidor** é o único processo que fala com a OpenAI. A chave vive em `System.getenv("OPENAI_API_KEY")` no servidor, jamais em `desktop/src/main/resources/` ou `web/`.
- Cliente chama `POST /api/ia/interpretar` (e variantes) com payload normal. Servidor traduz para chamada OpenAI via `openai-java`.

### SDK e modelos

- **SDK**: `com.openai:openai-java` (oficial OpenAI). Versão pinada em `server/pom.xml`.
- **Modelo padrão**: `gpt-4o-mini` (custo baixo, latência boa, suporta `responseFormat` structured outputs).
- **Modelo de maior qualidade**: `gpt-4o-2024-08-06` ou sucessor, configurável por env (`OPENAI_MODEL=...`).
- **Sem limite duro** de custo no MVP; **limite mensal configurável** via env (`OPENAI_MONTHLY_USD_LIMIT`). Quando excede, gateway desliga gracefully e devolve `{ ok: false, erro: 'IA desligada por limite de custo' }`.
- **Configurável pelo usuário** em Configurações → IA: ligar/desligar, modelo preferido, mostrar/ocultar custo.

### Structured Outputs (obrigatório)

Toda chamada usa `responseFormat = ResponseFormat.ofJsonSchema(JsonSchema.of(...))` ou o builder equivalente do `openai-java`. Schema gerado a partir de **records Java + Jackson** ou manualmente como `Map`.

Modelos mínimos suportados:
- `gpt-4o-mini` (e variantes `-2024-07-18` em diante)
- `gpt-4o-2024-08-06` e posteriores

Migração de modelo = ADR nova.

### Versionamento de prompts

Prompts em `server/src/main/resources/prompts/v<N>/`:

```
server/src/main/resources/prompts/
└── v1/
    ├── interpretar-nl.system.txt
    ├── interpretar-nl.schema.json   ← schema Jackson/Zod-equivalente
    ├── interpretar-nl.golden.jsonl  ← 20+ casos de regressão
    ├── decompor-entrega.system.txt
    ├── decompor-entrega.schema.json
    ├── decompor-entrega.golden.jsonl
    ├── resumir-pendencias.system.txt
    ├── ...
    └── README.md
```

Cada versão:
- Tem identificador (`v1`, `v2`, ...).
- Carrega o schema canônico.
- Carrega a golden list de regressão.
- Tem `src/test/java/.../prompts/v1/RegressaoV1Test.java` que valida que o prompt + schema + golden ainda produzem o resultado esperado (com `temperature=0`).

Versão ativa controlada por `AI_PROMPT_VERSION=v1` (env). Mudar de `v1` para `v2` exige:
1. ADR nova.
2. Migração dos `golden.jsonl` da v1 para a v2 (rodar a v2, comparar com v1, ajustar).
3. CI verde em ambos os arquivos.

### Funções expostas pela API

| Rota | Função | Modelo típico | Schema validado |
|---|---|---|---|
| `POST /api/ia/interpretar` | Texto em linguagem natural → estrutura de tarefa | `gpt-4o-mini` | record `TarefaInterpretada` |
| `POST /api/ia/decompor` | Tarefa complexa → lista de subtarefas | `gpt-4o-mini` | record `PlanoSubtarefas` |
| `POST /api/ia/sugerir-ordem` | Lista de tarefas → ordem sugerida | `gpt-4o-mini` | record `OrdemSugerida` |
| `POST /api/ia/resumir` | Lista de pendências → resumo | `gpt-4o-mini` | record `ResumoPendencias` |
| `POST /api/ia/detectar-conflitos` | Calendário → conflitos/sobrecarga | `gpt-4o-mini` | record `ConflitosDetectados` |
| `POST /api/ia/cobranca-texto` | Tarefa crítica → texto da cobrança | `gpt-4o-mini` | record `CobrancaTom` |

Todas as rotas:
- Exigem sessão válida.
- Logam: tokens in/out, latência, custo estimado, hash do prompt usado.
- Têm `try/catch` que devolve `{ ok: false, erro: 'IA indisponível' }` em falha de API — **nunca** quebra o app.
- Têm rate limit por usuário (10 chamadas/minuto por padrão; configurável).

### Telemetria

Tabela `ia_telemetria`:

```sql
CREATE TABLE ia_telemetria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT NOT NULL,
  rota TEXT NOT NULL,
  prompt_versao TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  custo_usd REAL,
  latencia_ms INTEGER,
  status TEXT,             -- 'ok' | 'erro_validacao' | 'erro_api' | 'erro_timeout'
  erro TEXT,
  criado_em TEXT NOT NULL
);
```

Tela Configurações → IA → Estatísticas mostra: total do mês, distribuição por rota, erros, gasto estimado.

### Testes de regressão

`tools/run-tests.mjs` (ou Maven Surefire equivalente) inclui suíte `RegressaoPromptsTest` que:
- Lê cada `golden.jsonl`.
- Constrói o prompt esperado.
- Chama a OpenAI com `temperature=0`.
- Valida o output contra o schema Jackson.
- Compara com o golden (deep equality dos campos determinísticos; tolera variação em texto livre se marcada como `flexible: true`).
- Falha o CI se qualquer caso regredir.

Por padrão, a suíte de regressão **não** roda em CI (custo). Roda em `cron` semanal com `--allow-cost` e gera relatório. PRs podem rodar `--single-case` para validação pontual.

### Desligamento

- Configuração `IA_HABILITADA=true` no servidor (env).
- `IA_HABILITADA=false` faz todas as rotas devolverem `{ ok: false, erro: 'IA desligada' }` sem chamar a OpenAI.
- Configurações → IA no app permite ao usuário desligar só para sua conta (`usuarios.ia_habilitada BOOLEAN`).
- Quando desligada, UI esconde o botão "✨ Interpretar com IA" sem erro.

## Consequências

### Positivas

- Chave nunca exposta. Verificado por grep no build.
- Toda resposta da IA é validada por schema antes de chegar na UI.
- Prompts versionados com golden tests — mudanças controladas.
- Telemetria dá visibilidade de custo e qualidade.
- Indisponibilidade da API é degradação graceful, não quebra do app.

### Negativas

- Custo mensal variável. Mitigado por limite configurável.
- Latência adicionada (1-3s) em tarefas com IA. Aceitável porque é opcional.
- Complexidade de manter golden tests (revisão periódica).

### Neutras

- Migração de modelo é manual (sem auto-fallback).
- Suporte a outros provedores (Anthropic, Google) é trivial via mesma interface, mas fora do MVP.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| SDK OpenAI no cliente (JavaFX) | Proibido. Chave vazaria. Quebra §1 do padrão. |
| Chave em variável de ambiente do JVM cliente | Cliente ainda tem o valor em texto claro. Proibido. |
| Function calling em vez de `responseFormat` | Vantagem marginal; `responseFormat` é mais determinístico. |
| Modo JSON sem `strict` | Não garante schema. PROJETO §13.2.3 obriga. |
| Claude / Gemini / local LLM | Suporte futuro via mesma interface. Fora do MVP. |
| Auto-fallback de modelo | Custo operacional; adiar. |
| Regressão em CI a cada PR | Caro. Adotar suíte semanal. |
| LangChain4j | Overhead de abstração; SDK oficial é mais simples. |

## Links

- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §13
- `PADRAO-ML-LOPES-DESIGN.md` §1, §4
- ADR 0001 (stack)
