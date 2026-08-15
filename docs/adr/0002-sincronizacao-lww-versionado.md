# ADR 0002 — Sincronização offline-first com LWW + version vector

> **Vinculante.** Precedência #3.
> Decidido em 14/08/2026 (Fase 0).
> **Revisão 1 (mesmo dia):** stack migrada para Java. Conceito e política permanecem; implementação agora em Java.

---

## Status

Aceito — **revisão 1** mantém o modelo de concorrência; implementação passa a ser Java.

## Contexto

PROJETO §14 (inalterado):

- Sincronização automática, operação offline, fila local, reenvio seguro, idempotência.
- Identificação de dispositivo, controle de versão dos registros, detecção de conflitos.
- Indicador claro de estado de sincronização, recuperação após falhas.
- Conflitos não podem usar LWW cego; a estratégia considera tipo de campo e risco de perda.
- Conflitos relevantes apresentam comparação e permitem resolução segura.
- Horários persistidos inequivocamente, com fuso configurado; recorrências e horário de verão tratados corretamente.

Padrão ML Lopes §1: "Offline é o normal". §3.5: multiterminal com um dono do dado.

## Decisão

### Modelo de concorrência

**LWW (Last-Writer-Wins) com version vector e tiebreaker determinístico.**

Cada registro replicado carrega:
- `id` (ULID gerado por `com.github.f4b6a3:ulid-creator`)
- `versao INTEGER` (incrementado a cada update local e no servidor)
- `dono_id TEXT` (multi-tenant-ready)
- `cliente_id TEXT` (id do dispositivo que originou a mudança)

Conflito é detectado por `(id, versao_cliente > versao_servidor)`. Empate resolvido por **ULID do dispositivo** (não por wall clock) — mesmo byte em qualquer máquina, sem depender de NTP.

### Política por tipo de campo

| Categoria de campo | Política | UI em conflito |
|---|---|---|
| Texto livre (descrição, observação) | LWW silencioso com auditoria | nenhuma |
| Etiquetas (set) | OR-Set (cresce com remoção) | nenhuma |
| Status | 3-way merge com heurística (não regride estado terminal) | modal se ambíguo |
| Vencimento / data | LWW + tela de resolução | modal lado-a-lado |
| Responsável | LWW + tela de resolução | modal lado-a-lado |
| Sub-tarefas / checklist | merge por `id` da sub-tarefa | nenhuma |
| Dependências | merge por `id` | nenhuma |
| Deleção | tombstone por 30 dias | nenhuma |

### Fila local (cliente)

Tabela `sync_fila` no banco local:

```sql
CREATE TABLE sync_fila (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  op TEXT NOT NULL,           -- 'upsert' | 'delete'
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,  -- ULID
  versao INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT
);
```

Manipulada por `desktop/.../sync/SyncFilaRepo.java` (JDBC puro).

### Push (cliente → servidor)

`POST /api/sync/empurrar` recebe `ops: [...]` (JSON array). Servidor aplica em transação:

```text
BEGIN;
  for op in ops:
    row = SELECT versao FROM tabela WHERE id = op.id FOR UPDATE;
    if row is null: INSERT
    elif op.versao > row.versao: UPDATE
    else: SKIP com log de auditoria
COMMIT;
```

Resposta JSON: `{ ok: true, versao_por_tabela: { tarefas: 42, ... }, ignoradas: [...] }`.

### Pull (servidor → cliente)

`GET /api/sync/puxar?cursor=<ulid>&tabela=tarefas` retorna ops com `versao > cursor`. Cliente aplica e atualiza `sync_cursors`.

### SSE

Javalin suporta SSE nativamente:

```java
app.sse("/sse/eventos", client -> {
    client.keepAlive();
    client.onClose(() -> inscritos.remove(client));
    inscritos.add(client);
});
```

Quando o servidor aplica uma op, emite `event: tarefa.atualizada` com `data: {"id": "...", "versao": 42}`. Cliente puxa delta.

### Periodicidade

- Empurrar: imediato (em background) + retry com backoff 5s, 30s, 2min, 10min, 30min.
- Puxar: imediato após empurrar + 60s quando online + SSE.
- Detecção de offline: monitoramento de `java.net.NetworkInterface` + tentativa periódica de `HttpClient.send` ao `/api/ping`.

### Indicador de estado

A UI JavaFX mostra um **badge de sync** com 4 estados:
- `Online · Sincronizado` (verde)
- `Online · X pendentes` (amarelo)
- `Offline · X pendentes` (cinza)
- `Erro · <último>` (vermelho, clicável para diagnóstico)

### Conflito em campo crítico

Modal JavaFX lado-a-lado com três botões: "Manter local" / "Manter servidor" / "Manter ambos" (quando aplicável). Decisão fica em auditoria.

### Horários

- Persistência em **UTC** (`TEXT` ISO 8601).
- Apresentação no fuso do usuário (configurável, `ZoneId` do Java).
- Recorrência calculada em UTC e apresentada em local; horário de verão tratado por `java.time.zone.ZoneRules`.

## Consequências

### Positivas

- Modelo simples, testável, auditável.
- Empate por ULID do dispositivo elimina dependência de NTP.
- Tombstones evitam "deleção fantasma" durante reconciliação.
- Idempotência total — repetição é segura.
- Migração de LWW para CRDT (ex: Automerge-java, Yrs) fica aberta como futuro opcional sem quebrar o modelo.

### Negativas

- LWW em `descricao` pode descartar edição concorrente (mitigado por auditoria).
- Sem merge automático de texto longo (não-edição colaborativa simultânea).
- SSE exige HTTP/2 ou proxies que respeitem long-lived connections.

### Neutras

- ULID vs UUIDv7: ambos servem; ULID foi escolhido por ordenação lexicográfica e base32 legível.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| CRDT completo (Yrs, Automerge-java) | Overhead de metadados; overkill para uso pessoal. |
| LWW puro (timestamp wall clock) | Deriva de relógio entre dispositivos; sem ordenação causal. |
| Operational Transform (OT) | Exige servidor central linearizador — não casa com offline-first. |
| CouchDB/PouchDB | Exige CouchDB no servidor; adiciona dependência operacional. |
| Realm/SQLite replicado | Amarra o cliente; menos controle sobre versionamento. |
| WebSocket em vez de SSE | SSE é mais simples e suficiente para push unidirecional. |
| Apenas pull (sem fila) | Não atende "operação offline" do PROJETO §14.1. |

## Links

- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §14
- `PADRAO-ML-LOPES-DESIGN.md` §1, §3.5
- ADR 0001 (stack — Java)
- ADR 0003 (banco — Xerial SQLite JDBC)
