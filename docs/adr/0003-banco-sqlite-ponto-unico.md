# ADR 0003 — Banco SQLite (Xerial JDBC) com WAL e migrações Flyway

> **Vinculante.** Precedência #3.
> Decidido em 14/08/2026 (Fase 0).
> **Revisão 1 (mesmo dia):** stack migrada para Java. Esta ADR passa a usar **Xerial SQLite JDBC** (mesmo engine SQLite, type 4 driver com nativos embutidos no JAR).

---

## Status

Aceito — **revisão 1** substitui a versão com `better-sqlite3` + `sql.js`.

## Contexto

PROJETO §7, §15, §17:

- Modelo de dados com identificação de usuário e isolamento de dados.
- Banco central relacional e auditável.
- Banco local para operação offline e fila de sincronização.
- Backup automatizado, retenção configurável, cópia fora do ambiente principal, verificação de integridade, teste documentado de restauração.

Padrão ML Lopes §4: regra de negócio em `core/`, função pura com `db` como 1º parâmetro, sequência `tmp → .old → move` na gravação, sem perda silenciosa.

## Decisão

### Engine e driver

- **Engine:** SQLite 3.50+ (compilado em C, embarcado).
- **Driver:** **Xerial SQLite JDBC 3.50.3+** (`org.xerial:sqlite-jdbc`).
- **Por que o Xerial:** Type 4 driver puro Java; bundle único com binários nativos para Windows, macOS, Linux (x86, x86_64, ARM, ARM64) extraídos automaticamente para o tempdir no primeiro load. Suporta GraalVM native-image desde 3.40.1.0. Sem dependência de `libsqlite3` instalado no sistema.

### Banco central (servidor)

- **Conexão:** HikariCP com `maximumPoolSize=10`, `minimumIdle=1`.
- **URL:** `jdbc:sqlite:data/gestor_central.db?journal_mode=WAL&foreign_keys=on&busy_timeout=5000&synchronous=NORMAL`.
- **Pragmas obrigatórios** aplicados na inicialização do pool:
  - `PRAGMA journal_mode = WAL`
  - `PRAGMA foreign_keys = ON`
  - `PRAGMA busy_timeout = 5000`
  - `PRAGMA synchronous = NORMAL`
  - `PRAGMA temp_store = MEMORY`
  - `PRAGMA cache_size = -20000` (20MB)
- **Localização:** `data/gestor_central.db` no servidor (gitignored). Backup em `data/backups/`.
- **Uma única instância do `DataSource` por processo**, injetada via construtor.

### Banco local (cliente)

- **Conexão:** direta, sem pool (single-thread no desktop). HikariCP com `maximumPoolSize=1` se quisermos padronizar.
- **URL:** `jdbc:sqlite:%APPDATA%/GestorInteligenteDeDemandas/gestor_local.db?journal_mode=WAL&foreign_keys=on&busy_timeout=5000`.
- **Pragmas:** mesmos do servidor.
- **Operação:** o driver Xerial já gerencia o arquivo. Aplicamos o padrão ML Lopes §4.3: gravação atômica via `tmp → renomeia → move` (mas como o SQLite faz isso internamente, usamos apenas `Connection.commit()` em transação; backup atômico do arquivo final via NIO `Files.move` com `ATOMIC_MOVE` quando vamos copiar para fora).
- **Debounce de 300ms** antes do `commit` para agrupar gravações seguidas (padrão §4.2).
- **Alta frequência:** método `db.runVolatil(...)` (específico nosso) que faz `INSERT/UPDATE` em transação separada, sem flush imediato — útil para presença/typing/heartbeat.

### Migrações

- **Flyway 10 community edition** no servidor.
- Migrations em `server/src/main/resources/db/migration/V1__init.sql`, `V2__...`, etc.
- **Convenções Flyway** (`V<n>__<descrição>.sql`) — versionamento ascendente, imutável.
- **Cada migration é testada sobre banco no formato anterior** (princípio 12 do AGENTS). Helper: `tests/MigracaoAntigaTest.java` carrega um dump da versão `n-1` e roda a migration `n`; falha se a contagem de linhas mudar ou se o schema novo for inválido.
- **Cliente:** sem Flyway (banco local é regenerado a partir do servidor via sync). Apenas migrations de bootstrap no primeiro boot, se necessário.

### Schema (visão)

- `id TEXT` (ULID de 26 chars, gerado por `com.github.f4b6a3:ulid-creator`).
- `dono_id TEXT NOT NULL` (multi-tenant-ready).
- `criado_em TEXT` (ISO 8601 UTC, gerado em `java.time.Instant.now().toString()`).
- `atualizado_em TEXT`.
- `versao INTEGER NOT NULL DEFAULT 1` em toda entidade replicada.
- `cliente_origem TEXT` (id do dispositivo que originou a mudança).
- Enums via `CHECK` constraint.
- Índices em todas as FKs e em colunas usadas em `WHERE` frequente.
- `auditoria` append-only (sem UPDATE nem DELETE; apenas INSERT).

### Tabelas

```
usuarios · sessoes · dispositivos
areas · clientes · projetos
tarefas · subtarefas · dependencias
anexos · etiquetas
lembretes · recorrencias_ocorrencias
auditoria
flyway_schema_history
```

`sync_fila` e `sync_cursors` existem **no cliente** apenas.

### Isolamento por usuário

- Toda query de negócio recebe `donoId` no primeiro parâmetro após `db` (padrão ML Lopes §3.2).
- O servidor injeta `donoId` da sessão antes de chamar `core/`.
- Cliente filtra localmente para evitar desperdício de banda.
- Nenhuma rota aceita `dono_id` do payload.

### Validação de entrada (defesa em profundidade)

- **Bean Validation** nos DTOs do Javalin: `@NotNull`, `@NotBlank`, `@Size`, `@Pattern`, `@Min`/`@Max`.
- **Prepared statements** em todas as queries (Xerial JDBC com `PreparedStatement` + bind parameters).
- **Sem concatenação de SQL** em hipótese alguma.

### Backup

- **Diário:** snapshot via `sqlite3 .backup` (online, não-bloqueante). Executado por um `@Scheduled` do Javalin (ou tarefa em thread separada, sem framework de scheduling).
- **Hash:** SHA-256 do arquivo (calculado em Java com `java.security.MessageDigest`).
- **Retenção:** 30 dias local + 90 dias em S3/B2 fora da VPS.
- **Validação:** `tools/test-restore.mjs` (Node, ou reescrito em Java) abre o backup, conta tabelas essenciais, restaura em arquivo temporário e compara contagens.
- **CI semanal:** job `restore-test` roda na Actions do GitHub.

### Recuperação

- Cliente: na inicialização, se o banco principal faltar, tenta abrir `.old` ou `.tmp`. Se também faltarem, **erro explícito** para o usuário (sem dado simulado).
- Servidor: rota `/api/admin/restore` (autenticada, ACL `admin`) aceita upload de snapshot validado por SHA-256 e restaura em transação.
- Migração: idempotente, testada sobre banco no formato anterior (princípio 12 do AGENTS).

## Consequências

### Positivas

- Consistência: mesmo engine no cliente e no servidor, sem conversões.
- Backup trivial, online, sem custo de infraestrutura adicional.
- Migração testável com SQLite de verdade.
- WAL permite leitura concorrente com escrita.
- Xerial JDBC é um único JAR com tudo embutido (sem `libsqlite3` no sistema).

### Negativas

- **JAR do Xerial é grande**: ~10-20 MB no classpath do instalador (nativos para múltiplas plataformas). Aceito o trade-off.
- **Extração do nativo** no primeiro load escreve no tempdir do Windows. Em ambientes muito restritos pode falhar; documentar como requisito.
- **SQLite com JDBC exige `synchronous=NORMAL` ou `=OFF` para performance aceitável**; aceito risco mínimo de corrupção (mitigado por WAL + tmp + .old + restore automático).
- **Sem pool sofisticado**: cada conexão JDBC Xerial tem lock; usar `synchronized` nas escritas concorrentes do desktop.

### Neutras

- Sem replicação master-slave (não é multi-região).
- Sem particionamento (não é multi-tenant em escala).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| `better-sqlite3` (Node) | Stack mudou para Java. |
| `sql.js` (WASM no cliente) | Stack mudou para Java; Xerial cobre cliente e servidor. |
| PostgreSQL | Complexidade operacional desnecessária para uso pessoal. |
| MySQL / MariaDB | Mesma avaliação. |
| H2 (embedded) | Não é o engine de produção; Xerial é mais "real SQLite". |
| Hibernate ORM | Overhead desnecessário; JDBC + Flyway dá controle total. |
| Banco em memória sem disco | Não atende backup, persistência. |
| Conexão por thread sem pool | Pool é barato e serve bem com HikariCP. |
| Modo `WITHOUT ROWID` global | Não cabe nas nossas queries; apenas onde for vantajoso. |

## Links

- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §7, §15, §17
- `PADRAO-ML-LOPES-DESIGN.md` §4 (gravação atômica, runVolatil)
- ADR 0001 (stack — Java + Xerial)
- ADR 0002 (sincronização)
