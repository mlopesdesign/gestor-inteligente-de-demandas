# 05 — Threat Model

> **Vinculante.** Precedência #1 (documento da Fase 1).
> Sem código de produto. Análise de ameaças STRIDE + LGPD, com contramedidas concretas em cada controle.

---

## 1. Escopo e suposições

**Em escopo**:
- Aplicativo desktop (Javalin + JNA) em Windows 11 do usuário.
- Aplicação web estática servida pelo servidor Java (Javalin).
- Servidor Java em VPS pessoal do proprietário.
- Sincronização entre dois ou mais dispositivos do mesmo usuário.
- Backup local e remoto do banco central.
- Canal externo opcional (e-mail, Telegram).

**Fora de escopo**:
- Outras pessoas usando o mesmo banco (multi-tenant real) — campo `dono_id` está pronto, mas MVP é single-tenant.
- Cenário de dispositivo físico roubado sem o usuário conseguir revogar.
- Adversary com acesso root ao Windows do usuário (game over).
- Adversary com acesso root à VPS do servidor (game over).

**Suposições**:
- O usuário mantém o Windows atualizado.
- O usuário usa HTTPS válido no servidor (Let's Encrypt ou similar).
- A senha do usuário é razoável (mín. 12 chars, ideal gerenciada por gerenciador de senhas).

## 2. Metodologia

Aplicamos **STRIDE** (Microsoft) por componente:

| Letra | Ameaça |
|---|---|
| **S**poofing | Falsificação de identidade (usuário, dispositivo, servidor) |
| **T**ampering | Adulteração de dados em trânsito ou em repouso |
| **R**epudiation | Negação de ação (sem auditoria confiável) |
| **I**nformation Disclosure | Vazamento de dados sensíveis |
| **D**enial of Service | Indisponibilidade |
| **E**levation of Privilege | Escalada para ação não autorizada |

## 3. Ativos

| Ativo | Classificação | Localização |
|---|---|---|
| Credenciais (senha, hash) | **Altamente confidencial** | Servidor |
| Banco central (todas as tarefas, projetos, clientes) | **Confidencial** | Servidor (SQLite) |
| Banco local | **Confidencial** | `%APPDATA%/GestorInteligenteDeDemandas/gestor_local.db` |
| Chave da API OpenAI | **Altamente confidencial** | env do servidor |
| Backups do banco central | **Confidencial** | Servidor + S3/B2 |
| Logs (estruturados) | **Interno** | Servidor + `%APPDATA%/.../log/` |
| Tokens de sessão (cookie) | **Confidencial** | Cookie do navegador / heap do app |
| Identidade do dispositivo | **Interno** | Banco |
| Web estática (HTML/CSS/JS) | **Público** | Servidor |

## 4. Matriz STRIDE

### 4.1 Servidor (Javalin + Xerial + Flyway)

| Ameaça | Vetor | Risco | Contramedida |
|---|---|---|---|
| **S** — Falsificar usuário | Roubo de cookie de sessão | Alto | Cookie httpOnly+SameSite+Secure; rotação por atividade; revogação manual; expiração 24h |
| **S** — Falsificar servidor | MITM com certificado falso | Alto | HTTPS com HSTS; pin de chave (planejado para F6) |
| **T** — Adulterar banco | SQL injection | Crítico | Prepared statements em 100% das queries; validação Hibernate Validator nos DTOs |
| **T** — Adulterar backup | Modificar dump antes de restaurar | Alto | SHA-256 em todo backup; validação antes de restaurar |
| **T** — Adulterar release | Trocar instalador publicado | Crítico | Authenticode (ADR 0007) + SHA-256 + comparação estrita |
| **R** — Negar ação | Usuário diz "não fui eu" | Médio | `auditoria` append-only com trigger que bloqueia UPDATE/DELETE; correlação com `dispositivo_id` |
| **I** — Vazamento de log | Logs com dados sensíveis | Médio | Mascaramento automático (`email@...`, `***@***`); revisão periódica |
| **I** — Vazamento de stacktrace | Erro 500 vaza caminho do servidor | Médio | Handler de erro genérico em prod; `detalhes.requestId` para correlação, sem stack |
| **D** — DDoS | Inundar a API | Baixo (uso pessoal) | Rate limit por IP e por usuário (`@Before` no Javalin); Caddy/Nginx como reverse proxy com fail2ban |
| **D** — Disco cheio | Logs/banco crescem sem cota | Médio | Rotação de logs (Logback); vacuum periódico do SQLite; alerta em 80% |
| **E** — Escalada | Sessão de usuário A acessar dados de B | Crítico | `dono_id` em toda query; servidor injeta `dono_id` da sessão; **nunca** aceita `dono_id` do payload |
| **E** — Rota sem auth | Esquecer `before("/api/*")` em alguma rota | Alto | Teste automatizado: `TodasRotasTest.java` que percorre `app.routes()` e verifica se rota autenticada exige sessão |
| **E** — CSRF em mutações web | Cookie de sessão + GET/POST em outro site | Médio | Cookie SameSite=Lax + header `X-CSRF-Token` em mutações web; validação server-side |

### 4.2 Banco local (cliente)

| Ameaça | Vetor | Risco | Contramedida |
|---|---|---|---|
| **T** — Adulterar fila | Adversary local com acesso ao `appdata` | Médio | WAL + journal_mode; integridade verificada ao abrir (PRAGMA `integrity_check`); backup automático do banco central via sync |
| **I** — Outro usuário do Windows lê o banco | Outros usuários do mesmo PC | Médio | Permissões NTFS no `%APPDATA%` (apenas usuário atual); auditoria de quem está logado |
| **R** — "Não fui eu" | Usuário nega operação | Médio | `cliente_origem` em toda op; log local de cada INSERT/UPDATE/DELETE com `usuario_windows` |
| **D** — Perda de banco | Crash, queda de energia | Alto | WAL + sequência tmp → .old → move no backup local; sync para o servidor |
| **E** — Aplicativo malicioso acessa o banco | Adversary que roda código no contexto do usuário | Médio | Caminho `%APPDATA%` conhecido mas não trivial; `integrity_check` na abertura; telemetria de tentativas |

### 4.3 Transporte (HTTPS)

| Ameaça | Vetor | Risco | Contramedida |
|---|---|---|---|
| **S** — MITM | Adversary com certificado falso | Alto | Let's Encrypt ou similar; HSTS |
| **T** — Adulterar payload | Adversary em Wi-Fi público | Alto | TLS 1.2+ obrigatório |
| **I** — Sniffing | Mesma LAN | Baixo | HTTPS criptografa payload |

### 4.4 Atualização

Ver ADR 0007. Quatro camadas:
1. HTTPS (GitHub Releases).
2. SHA-256 publicado.
3. Authenticode no binário.
4. Política de versão maior (anti-downgrade).

### 4.5 IA (gateway OpenAI)

| Ameaça | Vetor | Risco | Contramedida |
|---|---|---|---|
| **I** — Prompt injection | Usuário coloca dado malicioso em campo livre que vira prompt | Médio | Sanitização no servidor; prompts versionados; respostas validadas por schema Jackson antes de chegar à UI |
| **I** — Vazamento de dados para OpenAI | Dados do usuário são enviados para OpenAI | Médio (depende de contrato OpenAI) | Usuário é avisado em Configurações → IA; opção de desligar; telemetria registra volume; chaves em env do servidor |
| **D** — Custo | API cara sem controle | Médio | Limite mensal configurável; desligamento automático; telemetria com `custo_usd` por chamada |
| **R** — "Não pedi isso" | IA sugere prazo; usuário diz que não foi ele | Baixo | Toda sugestão exige **confirmação explícita** do usuário antes de virar tarefa |

### 4.6 Notificações

| Ameaça | Vetor | Risco | Contramedida |
|---|---|---|---|
| **T** — Adulterar notificação | Malware injeta notificação | Médio | `AppUserModelID` registrado; somente o app com o AUMID correto dispara |
| **I** — Conteúdo de notificação vaza info | Notificação mostra título da tarefa em tela bloqueada | Médio | Configuração por nível: tarefa CRÍTICA mostra título; DISCRETA mostra só "Você tem uma tarefa" |
| **D** — Spamming | Loop de notificações | Baixo | Rate limit interno: máx 1 notificação por tarefa a cada 5 min, independente do nível |

## 5. LGPD (Brasil)

Aplicam-se os artigos da **Lei 13.709/2018** para uso pessoal com preparação multi-tenant.

### 5.1 Princípios atendidos

| Artigo | Requisito | Implementação |
|---|---|---|
| Art. 6 — Princípios | Finalidade, necessidade, segurança | Dados só para o propósito do produto; mínimo necessário; criptografia em trânsito e em repouso |
| Art. 9 — Informações ao titular | Transparência | Tela "Configurações → Privacidade" lista o que é coletado, onde, por quê |
| Art. 16 — Segurança | Medidas técnicas | Ver §4 acima |
| Art. 18 — Direitos do titular | Acesso, correção, anonimização, portabilidade, eliminação | `GET /api/v1/usuario/exportar`; `POST /api/v1/usuario/apagar` (soft 30d, hard depois) |
| Art. 37 — Registro de operações | Logs de tratamento | `auditoria` |
| Art. 46 — Segurança e boas práticas | Padrões mínimos | Hash argon2id; TLS 1.2+; cabeçalhos de segurança |
| Art. 48/49 — Comunicação de incidente | Notificar em caso de incidente | Plano: usuário é notificado em até 2 dias úteis; procedimento documentado |

### 5.2 Funções na base

| Função LGPD | Implementação |
|---|---|
| Controlador | O próprio usuário (uso pessoal); para futuro multiusuário, Marcio |
| Operador | Mesmo (instalação pessoal) |
| Encarregado (DPO) | N/A para uso pessoal; estrutura pronta para quando virar produto |

### 5.3 Transferência internacional

- A IA (OpenAI) é processada em servidores da OpenAI (EUA/EU). **Dado pessoal é compartilhado** quando o usuário usa a função de IA.
- O usuário é **explicitamente avisado** antes de ativar a IA.
- `IA_HABILITADA=false` por padrão se o usuário não consentiu.
- Consentimento registrado em `usuarios.ia_consentimento_em`.

## 6. Controles obrigatórios (checklist pré-F2)

- [ ] Cookie httpOnly+SameSite=Lax+Secure+Path=/
- [ ] Senha com argon2id (m=64MB, t=3, p=4)
- [ ] CSRF token em mutações web
- [ ] Helmet-equivalente em todas as respostas
- [ ] CORS whitelist
- [ ] Rate limit por IP e por usuário
- [ ] Cabeçalho `X-Content-Type-Options: nosniff`
- [ ] HSTS em produção
- [ ] Auditoria append-only com trigger
- [ ] Validação Hibernate Validator em todos os DTOs
- [ ] `dono_id` em toda query (sem aceitar do payload)
- [ ] `PreparedStatement` em 100% das queries
- [ ] Logs sem dados sensíveis
- [ ] Erro 500 sem stacktrace em prod
- [ ] SHA-256 em todo backup
- [ ] Authenticode no instalador (ADR 0007)
- [ ] Tela "Privacidade" com informações LGPD

## 7. Controles opcionais (F7+)

- [ ] Pin de chave (HPKP ou HPKP via registro em Caddy)
- [ ] Pen-test externo anual
- [ ] Bug bounty (só quando o produto virar público)
- [ ] 2FA (planejado para multiusuário futuro)
- [ ] Criptografia at-rest do banco (SQLCipher, se necessário)
- [ ] WAF (Cloudflare ou similar)
- [ ] CSP estrita (sem inline JS; se o web precisar, refatorar)

## 8. Cenários de teste de segurança (Fase 7)

Ver `01-MODELO-DOMINIO.md` e `PROJETO §23.3`. Resumo:

- Tentativa de SQL injection em `titulo` da tarefa → 400.
- Cookie expirado → 401.
- Cookie de outro usuário em rota autenticada → 401.
- Sessão revogada de um dispositivo → todas as requisições desse dispositivo → 401.
- Download do instalador e edição do binário → SHA-256 não bate → atualização abortada.
- Replay de op de sync (mesmo `(id, versao)`) → idempotente, sem duplicar.
- Token OpenAI inválido → `IA_INDISPONIVEL` (503), app continua.
- Backup corrompido → SHA-256 não bate → restauração abortada.

## 9. Cross-references

- API: `03-CONTRATOS-API.md` §3.2, §18, §19.
- Sync: `04-POLITICA-SYNC.md` §3, §5.
- Notificações: `06-ESTRATEGIA-NOTIFICACOES.md`.
- Instalação: `07-ESTRATEGIA-INSTALACAO.md`.
- ADR 0001, 0002, 0003, 0004, 0007.

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Fase 1 — Especificação e arquitetura — 14/08/2026.*
