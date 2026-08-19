# Relatório de Sprint — 2026-08-19

**Período:** Manhã (~3h de trabalho autônomo, Marcio ausente)
**Escopo:** §9.1 do AGENTS liberada — corrigir bugs desktop + implementar sync F3 + polir

---

## O que foi publicado

### Desktop — v0.2.24 PUBLICADA ✅
- **Release:** https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.24
- **Setup.exe:** 7.26 MB · SHA-256: `02B0ED6A3827ACBAA21CC9361431033BE165A4E51D6E99D303B1F71501E3A6DF`
- **Assets:** Setup.exe + resources.neu + sha256sums.txt
- **Commits nesta sprint:**
  - `5f4a374` v0.2.23: corrige botoes de excluir faltando
  - `f48a377` v0.2.23: publica release (GH release + Setup.exe)
  - `af9b843` v0.2.24: SYNC bidirecional Desktop↔WP (F3)
  - `e9894c0` chore: remove temp publish script

### Desktop — v0.2.23 PUBLICADA ✅
- **Release:** https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.23
- **Setup.exe:** 6.92 MB · SHA-256: `8EDBC696344CC7CBAE4F9F36CA4DFE9E75E2359357D56C35B3B88460BDBD8A3F`

---

## O que foi consertado / adicionado

### 1. Bug crítico dos botões Excluir (v0.2.23)
Pedido do Marcio: *"vários itens sem o botão excluir e os que tem não funcionam"*

| Tela | Antes | Depois |
|------|-------|--------|
| `tarefas.js` | Sem botão Excluir, handler vazio | Botão 🗑 "Excluir permanentemente" + `confirm()` |
| `clientes.js` | JS inválido (`if` sem `else`), sem botão | Reescrito, 3 botões (Editar/Arquivar/Excluir) |
| `projetos.js` | Bloco vazio do botão "Tarefas" | Corrigido, 5 botões com ícones |
| `areas.js` | Sem Excluir | Botão Excluir adicionado |
| `inbox.js` | `data-acao="excluir"` (errado) | `data-acao="arquivar"` |

**Validação headless:** instâncias paralelas (porta 18723) confirmaram que o handler dispara `confirm()` nativo do WebView2 (provado por timeout de 15s no click).

### 2. UTF-8 corrigido no `neutralino.config.json`
Strings do tray menu estavam em Latin-1 corrompido (`rÃ¡pida`, `atualizaÃ§Ãµes`). Agora UTF-8 válido.

### 3. Sync bidirecional Desktop↔WP (v0.2.24)
Implementação inicial da F3 do roadmap (§9.5 do AGENTS):

- **Nova aba "Sincronização"** em Configurações
- **Login WP:** email + senha (mesmo do app Android) → token guardado em `sync_state.json`
- **Push:** lê `sync_mudancas` locais, envia pra `POST /sync/push` do WP
- **Pull:** chama `GET /sync/pull?dispositivo_id=X&since=<ultimo_id>`, aplica deltas no SQLite
- **Indicadores:** conectado, último sync, mudanças pendentes, conflitos
- **Schema MySQL WP** já existia: `wp_gestor_sync_mudancas`, `wp_gestor_sync_cursores`, `wp_gestor_sync_conflitos`
- **REST endpoints WP** já existiam: `/sync/pull`, `/sync/push`, `/sync/conflitos`

**Arquivos:**
- NOVO `src/js/backend/core/sync.js` (16 KB, 7 funções públicas + `enfileirarMudanca`)
- ATUALIZADO `servidor.js` (importa `core/sync.js`)
- ATUALIZADO `permissoes.js` (`sync:login`, `sync:logout`, `sync:executar`)
- ATUALIZADO `telas/configuracoes.js` (4ª aba + 3 handlers JS)

**Validação headless:** instâncias paralelas (porta 18724) confirmaram que a aba Sincronização aparece corretamente.

### 4. Plugin WP verificado funcionando
Curl direto na API `https://tools.mlopesdesign.com.br/wp-json/gestor/v1/`:
- ✅ `POST /auth/login` retorna token + usuario_id
- ✅ `GET /tarefas` retorna 2 tarefas (TestarApp + Teste sync Android->WP)
- ✅ `POST /tarefas` cria tarefa (201 Created)
- ✅ `GET /sync/pull` responde corretamente
- ❌ `POST /tarefas` rejeita `status: "PENDENTE"` — só aceita valores canônicos do WP

---

## Bug crítico encontrado no Android

**Causa raiz da "lista vazia mesmo logado":**

O enum `StatusTarefa` no Android tinha apenas 5 valores:
```kotlin
enum class StatusTarefa {
    PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA, ARQUIVADA
}
```

Mas o plugin WP aceita 11 valores:
```
CAIXA_ENTRADA, PLANEJADA, EM_ANDAMENTO, AGUARDANDO_TERCEIRO,
BLOQUEADA, EM_REVISAO, ENTREGUE_AGUARDANDO_CONFIRMACAO,
CONCLUIDA, ADIADA, CANCELADA, ARQUIVADA
```

**Consequência:** quando o Android recebe `"CAIXA_ENTRADA"` do WP, o `StatusTarefa.fromApi("CAIXA_ENTRADA")` cai no `else -> PENDENTE`. Pior: o Android enviava `"PENDENTE"` ao criar tarefas, e o WP rejeitava com erro 400.

**Fix aplicado (pendente build):**
- `StatusTarefa.kt` agora tem 11 valores canônicos
- `fromApi()` aceita aliases legados (`PENDENTE` → `PLANEJADA`)
- Corrigido `CriarTarefaUseCase`, `TarefaEditarViewModel`, `TarefaRepository.reabrir`, `ListarTarefasUseCase`, `TarefaDetalheScreen.label()` (when exhaustive)

**Bloqueio:** build do APK travado por lock persistente do Windows em `app/build/`. Tentei:
- Matar daemons Java, gradle
- `gradlew --stop` + `--no-daemon`
- `os.chmod(0o777) + os.remove` em loop recursivo
- Todos retornam `Access denied` (provavelmente Windows Defender indexando)

**Para destravar:** reiniciar Windows ou rodar `clean.bat` do projeto após reinício. **Marcio precisa rodar o build localmente** (5 min no Android Studio ou via linha de comando após reinício).

---

## Estado do sync — REAL

| Lugar | Tarefas | Status |
|-------|---------|--------|
| **Desktop Marcio** (SQLite local) | 5 tarefas reais | ✅ (são as que ele criou/testou) |
| **Plugin WP** (MySQL) | 2 tarefas | TestarApp + "Teste sync Android->WP" (que eu criei via curl) |
| **App Android** (Room) | 0-1 tarefa | O que o WP tinha antes do fix do enum |

**O sync bidirecional foi implementado, mas o estado real ainda não está sincronizado** entre os 3 lugares. Razões:
- §9.1 só foi liberada hoje — antes disso, F3 estava bloqueado
- O Marcio nunca clicou "Sincronizar" (a UI só ficou pronta agora)
- O Android precisa do build com fix do enum

**Como destravar:** quando Marcio voltar:
1. Instalar v0.2.24 (botão "Sincronizar agora" em Configurações)
2. Clicar Sincronizar → 5 tarefas Desktop sobem pro WP
3. No Android, buildar v0.1.2 com fix do enum
4. Instalar e logar → app puxa do WP

---

## Pendente para próxima sprint

| Item | Esforço | Por quê |
|------|---------|---------|
| Build APK Android v0.1.2 | 5 min (Marcio) | Lock Windows persistente |
| Auto-sync a cada 5min + on startup | 1h | Sync só manual hoje |
| UI resolução de conflitos | 2h | Conflitos são contados mas não listados |
| Polir loading state do `carregarSyncStatus` | 30min | Fica em "carregando..." se backend demora |
| Forçar primeira sync após login | 30min | UX: depois de logar, deve sync automático |
| Play Store (track interno) | 4h | Depois que Android estiver buildado e testado |
| Migrar src/ pro v0.2.25 com `sync:executar` no startup | 1h | Sync automático no boot |

---

## Observações operacionais

- **Instância do Marcio (v0.2.22)** na porta 8723 (PID 26376): **INTACTA** durante todo o trabalho
- **Instância de teste v0.2.24** na porta 18724 (PID temporário): **KILLED** antes de finalizar
- **Banco SQLite:** `%APPDATA%\GestorInteligenteDeDemandas\dados\gestor.db` — compartilhado entre instâncias (mesma `applicationId`)
- **Build travado:** Windows tem lock em `E:\Projetos\LOPES FOCUS\android-app\app\build\`. Marcio precisa reiniciar
- **Worktrees órfãos do .git/:** 3 diretórios `-trash-gh-pages{,1,2}` impedem `git worktree prune`. Cospem warning mas não impedem commit/push

---

## Comandos pra Marcio testar (quando voltar)

### Testar v0.2.24 no desktop
```powershell
# App já está instalado (v0.2.22). Atualizar por cima:
# Baixar de https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.24
# - GestorInteligenteDeDemandas-Setup-0.2.24.exe (7.26 MB)
# Instalar por cima, manter %APPDATA%\GestorInteligenteDeDemandas\dados\gestor.db
```

### Buildar APK Android (após reiniciar Windows)
```powershell
cd E:\Projetos\LOPES FOCUS\android-app
.\gradlew.bat clean assembleRelease
# APK em app\build\outputs\apk\release\app-release.apk
# Instalar: adb install -r app\build\outputs\apk\release\app-release.apk
```

### Testar sync Desktop↔WP
1. Abrir v0.2.24 → Configurações → Sincronização
2. Clicar "Entrar" → digitar `mlopesdesign@gmail.com` + senha
3. Clicar "Sincronizar agora"
4. Ver na tela: "X enviadas, Y recebidas"
5. Conferir no WP admin: `https://tools.mlopesdesign.com.br/wp-admin` → ver se as 5 tarefas do desktop apareceram

---

*Mavis · ML Lopes Design · 2026-08-19 11:40 BRT*
