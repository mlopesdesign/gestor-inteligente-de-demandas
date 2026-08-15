# 03 — Contratos da API

> **Vinculante.** Precedência #1 (documento da Fase 1).
> Sem código de produto. Especifica a API HTTP+SSE do servidor Javalin.
> Versionamento: **header `X-API-Version`** + prefixo `/api/v1/...`.

---

## 1. Princípios

- **REST** puro, JSON, UTF-8.
- **Erros** sempre como `{ok:false, erro:{codigo,mensagem,detalhes?}}` — nunca stacktrace.
- **Datas** sempre ISO 8601 UTC (`2026-08-14T19:00:00.000Z`).
- **IDs** sempre ULID como string.
- **Paginação** cursor-based (`?cursor=<ulid>&limite=50`).
- **Versionamento**: header `X-API-Version: 1` obrigatório em toda chamada. Resposta inclui `X-API-Version` echo.
- **Compatibilidade**: novos campos opcionais permitidos. Remoção ou mudança de tipo de campo existente = nova major version.
- **Autenticação**: cookie `gestor_sessao` (httpOnly, SameSite=Lax, Secure em prod).
- **CORS**: web (`https://app.gestor.example`) e app desktop (`http://127.0.0.1:8750`).
- **Rate limit**: 100 req/min por IP; 10 chamadas de IA por minuto por usuário.
- **Idioma**: mensagens de erro em **pt-BR**; logs em **en**; documentação em **pt-BR**.

## 2. Topologia

```
/api/v1/...                    API REST versionada
/sse/v1/eventos                Server-Sent Events (autenticação via ?sessao=ULID)
/web/...                       Estático (HTML/CSS/JS puros) servido pelo Javalin
/healthz                       Healthcheck (sem auth, sem versão)
```

## 3. Modelo de resposta

### 3.1 Sucesso

```json
{
  "ok": true,
  "dados": { ... }
}
```

### 3.2 Erro

```json
{
  "ok": false,
  "erro": {
    "codigo": "TAREFA_NAO_ENCONTRADA",
    "mensagem": "Tarefa abc123 não encontrada ou sem acesso.",
    "detalhes": { "tarefa_id": "abc123" }
  }
}
```

Códigos de erro padronizados:

| Código | HTTP | Significado |
|---|---|---|
| `NAO_AUTENTICADO` | 401 | Sem cookie de sessão ou sessão revogada/expirada |
| `SEM_PERMISSAO` | 403 | Sessão válida mas ação não autorizada |
| `NAO_ENCONTRADO` | 404 | Recurso inexistente ou inacessível (não diferencia por segurança) |
| `CONFLITO_VERSAO` | 409 | `versao` enviada < versão atual do servidor (LWW estourado) |
| `CONFLITO_CAMPO` | 409 | Conflito de campo exige UI de resolução |
| `VALIDACAO` | 400 | Erro de schema (Hibernate Validator) |
| `REQUISICAO_INVALIDA` | 400 | Erro semântico (ex: cancelar sem motivo) |
| `LIMITE_EXCEDIDO` | 429 | Rate limit |
| `IA_INDISPONIVEL` | 503 | OpenAI fora ou limite de custo |
| `IA_DESLIGADA` | 422 | Usuário ou servidor com IA desligada |
| `INTERNO` | 500 | Erro inesperado; `detalhes.requestId` para correlação |

## 4. Autenticação e dispositivos

### 4.1 `POST /api/v1/auth/login`

```json
// request
{
  "email": "marcio@example.com",
  "senha": "...",
  "dispositivo": {
    "nome": "Lopes — Desktop Escritório",
    "sistema": "Windows 11 Pro 23H2",
    "app_versao": "0.1.0"
  }
}

// response 200
{
  "ok": true,
  "dados": {
    "usuario": { "id": "...", "email": "...", "nome": "..." },
    "sessao_expira_em": "2026-08-15T19:00:00.000Z"
  }
}
```
- Set-Cookie: `gestor_sessao=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`.
- Cria/atualiza `dispositivos` automaticamente.
- 401 se credenciais inválidas (genérico, sem distinguir "email inexistente" de "senha errada").

### 4.2 `POST /api/v1/auth/logout`

Invalida a sessão atual. 204 sem corpo.

### 4.3 `GET /api/v1/auth/sessao`

Retorna a sessão atual + usuário + dispositivo. Útil para a web saber quem é.

```json
{
  "ok": true,
  "dados": {
    "usuario": { "id": "...", "email": "...", "nome": "...", "fuso": "America/Sao_Paulo", "ia_habilitada": true },
    "dispositivo": { "id": "...", "nome": "...", "sistema": "...", "app_versao": "..." }
  }
}
```

### 4.4 `GET /api/v1/dispositivos`

Lista dispositivos do usuário. 200 com array.

### 4.5 `POST /api/v1/dispositivos/{id}/revogar`

Invalida todas as sessões do dispositivo. 204.

## 5. Áreas

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/areas` | Lista do usuário (ordenada por `ordem`) |
| `POST` | `/api/v1/areas` | Cria. Body: `{nome, cor?, ordem?}` |
| `PATCH` | `/api/v1/areas/{id}` | Edita nome/cor/ordem. Espera `versao` para LWW |
| `DELETE` | `/api/v1/areas/{id}` | Soft-delete (vira `ARQUIVADA` se houver tarefas) ou 409 se em uso |

`PATCH`:
```json
// request
{ "nome": "Pessoal", "cor": "#FF8800", "ordem": 2, "versao": 1 }
// response 200
{ "ok": true, "dados": { "id": "...", "versao": 2, "atualizado_em": "..." } }
// 409 CONFLITO_VERSAO se versao_enviada < versao_servidor
```

## 6. Clientes

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/clientes?cursor=&status=&busca=` | Lista paginada |
| `GET` | `/api/v1/clientes/{id}` | Detalhe |
| `POST` | `/api/v1/clientes` | Cria |
| `PATCH` | `/api/v1/clientes/{id}` | Edita (com `versao`) |
| `DELETE` | `/api/v1/clientes/{id}` | Soft-delete (`status=ARQUIVADO`) |

## 7. Projetos

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/projetos?cursor=&status=` | Lista paginada |
| `GET` | `/api/v1/projetos/{id}` | Detalhe + tarefas filhas |
| `POST` | `/api/v1/projetos` | Cria |
| `PATCH` | `/api/v1/projetos/{id}` | Edita (com `versao`) |
| `DELETE` | `/api/v1/projetos/{id}` | Soft-delete |
| `POST` | `/api/v1/projetos/{id}/recalcular-progresso` | Recalcula `progresso_calc` |

## 8. Tarefas (núcleo)

### 8.1 Endpoints REST

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/tarefas?cursor=&status=&prioridade=&area=&projeto=&cliente=&etiqueta=&vencidas=&hoje=&semana=&busca=` | Lista filtrada |
| `GET` | `/api/v1/tarefas/{id}` | Detalhe completo |
| `POST` | `/api/v1/tarefas` | Cria (origem MANUAL ou NL confirmada) |
| `PATCH` | `/api/v1/tarefas/{id}` | Edita (com `versao`) |
| `PATCH` | `/api/v1/tarefas/{id}/status` | Atalho de mudança de status (corpo: `{status, motivo?}`) |
| `POST` | `/api/v1/tarefas/{id}/concluir` | Marca como concluída |
| `POST` | `/api/v1/tarefas/{id}/reabrir` | Reabre com motivo obrigatório |
| `POST` | `/api/v1/tarefas/{id}/cancelar` | Cancela com motivo obrigatório |
| `POST` | `/api/v1/tarefas/{id}/adiar` | Adia com nova data + motivo se vencida |
| `POST` | `/api/v1/tarefas/{id}/entregar` | Marca como entregue (aguarda confirmação) |
| `POST` | `/api/v1/tarefas/{id}/confirmar` | Confirma entrega (executado vs entregue) |
| `POST` | `/api/v1/tarefas/{id}/duplicar` | Cria cópia com novo ULID |
| `GET` | `/api/v1/tarefas/{id}/subtarefas` | Lista |
| `POST` | `/api/v1/tarefas/{id}/subtarefas` | Adiciona |
| `PATCH` | `/api/v1/tarefas/{id}/subtarefas/{sid}` | Edita |
| `DELETE` | `/api/v1/tarefas/{id}/subtarefas/{sid}` | Remove |
| `POST` | `/api/v1/tarefas/{id}/subtarefas/ordenar` | Reordena array de IDs |
| `GET` | `/api/v1/tarefas/{id}/dependencias` | Lista |
| `POST` | `/api/v1/tarefas/{id}/dependencias` | Adiciona (detecta ciclo) |
| `DELETE` | `/api/v1/tarefas/{id}/dependencias/{depende_de}` | Remove |
| `GET` | `/api/v1/tarefas/{id}/anexos` | Lista |
| `POST` | `/api/v1/tarefas/{id}/anexos` | Adiciona (upload via multipart) |
| `DELETE` | `/api/v1/tarefas/{id}/anexos/{aid}` | Remove |

### 8.2 POST /api/v1/tarefas (criar)

```json
// request
{
  "titulo": "Entregar fotos do evento Cenário Alagoas",
  "descricao": "...",
  "area_id": "...",
  "projeto_id": null,
  "cliente_id": "...",
  "prioridade": "ALTA",
  "nivel_cobranca": "INTENSIVA",
  "inicio_em": null,
  "vencimento_em": "2026-08-16T21:00:00.000Z",
  "duracao_estimada_min": 120,
  "etiquetas": ["fotografia", "cenario-alagoas"],
  "subtarefas": [
    { "titulo": "Selecionar fotos", "ordem": 1 },
    { "titulo": "Editar", "ordem": 2 }
  ],
  "lembretes": [
    { "momento": "2026-08-14T13:00:00.000Z", "canal": "WINDOWS_LOCAL" },
    { "momento": "2026-08-15T13:00:00.000Z", "canal": "WINDOWS_LOCAL" }
  ],
  "origem": "MANUAL"
}

// response 201
{
  "ok": true,
  "dados": { "id": "...", "versao": 1, "criado_em": "..." }
}
```

### 8.3 PATCH /api/v1/tarefas/{id} (editar)

```json
// request — body parcial, só campos a alterar
{ "titulo": "novo título", "versao": 1 }

// response 200
{ "ok": true, "dados": { "id": "...", "versao": 2, "atualizado_em": "..." } }

// 409 CONFLITO_VERSAO
{ "ok": false, "erro": { "codigo": "CONFLITO_VERSAO", "mensagem": "Sua versão está atrasada.", "detalhes": { "versao_servidor": 3 } } }
```

## 9. Hoje, próximas ações, calendário

### 9.1 `GET /api/v1/hoje`

Retorna agregados para a tela "Hoje" no fuso do usuário.

```json
{
  "ok": true,
  "dados": {
    "atrasadas": [ ... 5 tarefas ... ],
    "criticas": [ ... ],
    "vencendo_hoje": [ ... ],
    "em_andamento": [ ... ],
    "bloqueadas": [ ... ],
    "aguardando_terceiros": [ ... ],
    "concluidas_hoje": [ ... ]
  }
}
```

### 9.2 `GET /api/v1/proximas-acoes?limite=20`

Lista priorizada (regra: vencimento + prioridade + duração + dependências + carga do dia).

### 9.3 `GET /api/v1/calendario?de=2026-08-01&ate=2026-08-31&modo=mes`

`modo` ∈ {`dia`, `semana`, `mes`, `ano`, `agenda`}.

## 10. Revisões

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/revisoes/abertura?data=2026-08-14` | Resumo da manhã |
| `GET` | `/api/v1/revisoes/encerramento?data=2026-08-14` | Resumo do dia |
| `GET` | `/api/v1/revisoes/semana?de=2026-08-10` | Resumo semanal |

## 11. Painel

### 11.1 `GET /api/v1/painel`

```json
{
  "ok": true,
  "dados": {
    "demandas_abertas": 42,
    "tarefas_atrasadas": 3,
    "entregas_proximas_7d": 8,
    "carga_estimada_min_hoje": 240,
    "carga_estimada_min_amanha": 360,
    "adiamentos_total": 5,
    "tarefas_paradas_7d": 2,
    "taxa_conclusao_30d": 0.74,
    "tempo_planejado_30d_min": 4200,
    "tempo_realizado_30d_min": 4380,
    "projetos_em_risco": 1
  }
}
```

## 12. Sincronização

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/v1/sync/empurrar` | Cliente envia ops da fila local |
| `GET` | `/api/v1/sync/puxar?cursor=<ulid>&tabela=tarefas&limite=200` | Cliente recebe ops do servidor |
| `GET` | `/api/v1/sync/cursor` | Cursor atual do dispositivo |
| `POST` | `/api/v1/sync/reconciliar` | Envia decisão de conflito lado-a-lado |
| `GET` | `/api/v1/sync/status` | Diagnóstico |

Detalhamento: `04-POLITICA-SYNC.md`.

## 13. SSE (push em tempo real)

### 13.1 `GET /sse/v1/eventos?sessao=<ULID>`

Stream de eventos para cliente desktop e web. Eventos:

| `event:` | Quando | `data:` |
|---|---|---|
| `tarefa.criada` | Tarefa criada por este ou outro dispositivo | `{id, versao}` |
| `tarefa.atualizada` | Campos alterados | `{id, versao, diff_resumo}` |
| `tarefa.concluida` | — | `{id, versao}` |
| `tarefa.reaberta` | — | `{id, versao}` |
| `tarefa.cancelada` | — | `{id, versao}` |
| `lembrete.disparado` | Notificação enviada | `{lembrete_id, tarefa_id, nivel}` |
| `sync.conflito` | Conflito detectado | `{tabela, registro_id, diff}` |
| `dispositivo.revogado` | Outro dispositivo revogou este | `{}` |
| `atualizacao.disponivel` | Nova release publicada | `{tag, url_release}` |
| `manutencao.iniciada` | Servidor entrando em manutenção | `{previsao_min}` |

Conexão autenticada por query string `?sessao=<ULID>` (porque cookies não funcionam bem com EventSource). Reconexão automática (EventSource nativo) repete o último `Last-Event-ID`.

## 14. Notificações — admin

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/notificacoes/fila?estado=PENDENTE` | Lista |
| `POST` | `/api/v1/notificacoes/{id}/cancelar` | Desativa (cancela cobranças futuras) |
| `GET` | `/api/v1/notificacoes/diagnostico` | Logs e estado |

## 15. Inteligência Artificial (Fase 6)

| Método | Endpoint | Modelo típico | Schema validado |
|---|---|---|---|
| `POST` | `/api/v1/ia/interpretar` | `gpt-4o-mini` | `TarefaInterpretada` |
| `POST` | `/api/v1/ia/decompor` | `gpt-4o-mini` | `PlanoSubtarefas` |
| `POST` | `/api/v1/ia/sugerir-ordem` | `gpt-4o-mini` | `OrdemSugerida` |
| `POST` | `/api/v1/ia/resumir` | `gpt-4o-mini` | `ResumoPendencias` |
| `POST` | `/api/v1/ia/detectar-conflitos` | `gpt-4o-mini` | `ConflitosDetectados` |
| `POST` | `/api/v1/ia/cobranca-texto` | `gpt-4o-mini` | `CobrancaTom` |
| `GET` | `/api/v1/ia/estatisticas` | — | resumo da telemetria |

Todas validam o schema com Jackson antes de devolver; resposta é sempre JSON validado ou `IA_INDISPONIVEL`.

## 16. Conta (LGPD)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/usuario/exportar` | Exporta todos os dados do usuário (JSON + SQLite) |
| `POST` | `/api/v1/usuario/apagar` | Soft-delete (30 dias) + hard-delete depois |
| `PATCH` | `/api/v1/usuario` | Edita preferências (fuso, tom, ia_habilitada) |
| `PATCH` | `/api/v1/usuario/senha` | Troca senha (exige senha atual) |

## 17. OpenAPI 3.1

A especificação completa em `docs/openapi-v1.yaml` é gerada por `tools/gen-openapi.mjs` (apenas **ferramenta de build** Node; não vai no cliente) que lê o código Javalin via reflexão e produz o YAML. Esse script é a única exceção à regra "sem JS no cliente" — roda **apenas** no CI/build, gera artefato estático, e o cliente não usa.

Alternativa: `tools/gen-openapi.java` em Java (preferida). Será escrita na Fase 2.

## 18. Cabeçalhos obrigatórios

| Header | Cliente envia | Servidor responde |
|---|---|---|
| `X-API-Version: 1` | sim | sim (echo) |
| `X-Request-Id: <ulid>` | sim (gerado se faltar) | sim (echo) |
| `Content-Type: application/json; charset=utf-8` | sim | sim |
| `Cache-Control: no-store` | — | sim (em rotas autenticadas) |
| `X-Content-Type-Options: nosniff` | — | sim |
| `X-Frame-Options: DENY` | — | sim (exceto `/web/`) |
| `Content-Security-Policy` | — | sim (sem inline JS; relaxado só em `/web/`) |
| `Strict-Transport-Security` | — | sim (em prod) |

## 19. Permissões

Toda rota passa por `before("/api/v1/*", ...)` que valida sessão. Catálogo `PERM_ROTA` mapeia rota → permissão exigida:

```java
private static final Map<String, String> PERM_ROTA = Map.ofEntries(
    Map.entry("tarefas:criar", "tarefa:criar"),
    Map.entry("tarefas:editar", "tarefa:editar"),
    Map.entry("tarefas:concluir", "tarefa:concluir"),
    Map.entry("tarefas:reabrir", "tarefa:reabrir"),
    Map.entry("tarefas:cancelar", "tarefa:cancelar"),
    Map.entry("tarefas:adiar", "tarefa:adiar"),
    Map.entry("ia:interpretar", "ia:usar"),
    // ...
);
```

Para o MVP, há apenas um perfil implícito: **o próprio dono**. As permissões serão expandidas em versão multiusuário futura (multi-tenant-ready por `dono_id`, ADR 0003).

## 20. Cross-references

- Domínio: `01-MODELO-DOMINIO.md`.
- Modelo de dados: `02-MODELO-DADOS.md`.
- Sync: `04-POLITICA-SYNC.md`.
- Notificações: `06-ESTRATEGIA-NOTIFICACOES.md`.
- Segurança: `05-THREAT-MODEL.md`.
- ADR 0001 (stack Javalin), ADR 0004 (IA).

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Fase 1 — Especificação e arquitetura — 14/08/2026.*
