# Matriz de Rastreabilidade · Gestor Inteligente de Demandas

> **Vinculante.** Precedência #2.
> Cita o requisito original, o ADR que decide, o documento da Fase 1 que detalha, e a fase de entrega.

---

## Legenda

- **PROJ §** = seção do `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md`
- **PAD §** = seção do `PADRAO-ML-LOPES-DESIGN.md` (apenas itens não-linguísticos vinculantes)
- **F1 §** = seção do documento correspondente da Fase 1 (`docs/01..07-*.md`)
- **ADR** = `docs/adr/NNNN-titulo.md`
- **Fase** = fase do plano que entrega
- **Tipo**: F (funcional) · NF (não-funcional) · S (segurança) · OPS (operação) · UX · IA

---

## 1. Identidade, governança e operação

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-GOV-01 | PROJ §1 | Lista, lê e hierarquiza normativos antes de código | AGENTS.md | — | F0 | OPS |
| R-GOV-02 | PROJ §26 | Decisões materiais registradas em ADR | `docs/adr/` | — | F0 | OPS |
| R-GOV-03 | PAD §7.1 | Commit por sessão, remote obrigatório | git + GH | — | F2 | OPS |
| R-GOV-04 | PAD §7.2 | Documentação na mesma entrega | manual/graphify | — | contínua | OPS |
| R-GOV-05 | PAD §5.4 | Identidade imutável preservada | AGENTS §1 | `07-ESTRATEGIA-INSTALACAO.md` §1 | contínua | NF |
| R-GOV-06 | autorização Fase 1 | Diagramas via Mermaid, **sem** `gen-graphify.mjs` JS | — | todos | F1 | OPS |
| R-GOV-07 | autorização Fase 1 | Exceções e decisões só em ADR | — | — | F0/F1 | OPS |

## 2. Produto e UX

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-UX-01 | PROJ §2 | Não é lista, é gestor de execução | telas Hoje/Próximas | `01-MODELO-DOMINIO.md` §5 | F3/F4 | UX |
| R-UX-02 | PROJ §19 | Design premium, dark+light, clean | `css/tema-*.css` | — | F7 | UX |
| R-UX-03 | PROJ §20 | Acessibilidade (foco, contraste, escala Windows) | revisão F7 | — | F7 | UX |
| R-UX-04 | PROJ §20 | pt-BR + formatos BR | formatadores | `03-CONTRATOS-API.md` §1 | F3 | UX |
| R-UX-05 | PROJ §9.3 | Notificações com ações; fechar ≠ concluir | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §3.2 | F4 | UX |
| R-UX-06 | PROJ §9.4 | Tom configurável (profissional/firme/gentil) | config | `06-ESTRATEGIA-NOTIFICACOES.md` §4 | F4 | UX |
| R-UX-07 | PROJ §10.1 | Caixa de entrada com 1 texto | `core/caixa.js` | `01-MODELO-DOMINIO.md` §8.1 | F3 | UX |
| R-UX-08 | PROJ §10.4 | Atalho global Windows para captura | JavaFX KeyEvent hook | `07-ESTRATEGIA-INSTALACAO.md` (atalho em Configurações) | F4 | UX |
| R-UX-09 | PROJ §11 | Hoje, Próximas ações, calendário, projetos, busca, painel | telas F3 | `03-CONTRATOS-API.md` §9, §11 | F3 | UX |
| R-UX-10 | PROJ §12 | Abertura, encerramento, semanal | telas F4 | `03-CONTRATOS-API.md` §10 | F4 | UX |

## 3. Domínio (tarefas, projetos, clientes, áreas)

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-DOM-01 | PROJ §7.5 | Modelo de tarefa completo (todos os campos do item) | — | `01-MODELO-DOMINIO.md` §5 | F3 | F |
| R-DOM-02 | PROJ §7.6 | Subtarefa e checklist com ordenação/status | — | `01-MODELO-DOMINIO.md` §5.5 | F3 | F |
| R-DOM-03 | PROJ §7.2 | Áreas livres, sem nomes fixos | — | `01-MODELO-DOMINIO.md` §4.1 | F3 | F |
| R-DOM-04 | PROJ §7.3 | Cliente/contato completo | — | `01-MODELO-DOMINIO.md` §4.2 | F3 | F |
| R-DOM-05 | PROJ §7.4 | Projeto com progresso calculado | — | `01-MODELO-DOMINIO.md` §4.3 | F3 | F |
| R-DOM-06 | PROJ §8 | Estados: caixa, planejada, em andamento, aguardando, bloqueada, em revisão, entregue, concluída, adiada, cancelada, arquivada | — | `01-MODELO-DOMINIO.md` §5.1, §5.3 | F3 | F |
| R-DOM-07 | PROJ §8.1 | Concluir registra autor, dispositivo, horário | — | `01-MODELO-DOMINIO.md` §8.2 | F3 | F |
| R-DOM-08 | PROJ §8.2 | Trabalho executado × entrega confirmada (ações distintas) | — | `01-MODELO-DOMINIO.md` §5.1 (status ENTREGUE_AGUARDANDO_CONFIRMACAO) | F3 | F |
| R-DOM-09 | PROJ §8.3 | Reabrir preserva histórico | — | `01-MODELO-DOMINIO.md` §8.3 | F3 | F |
| R-DOM-10 | PROJ §8.4 | Cancelamento exige motivo | — | `01-MODELO-DOMINIO.md` §5.2 (invariante 4) | F3 | F |
| R-DOM-11 | PROJ §8.5 | Reprogramação de vencida exige motivo | — | `01-MODELO-DOMINIO.md` §5.2 (invariante 5) | F3 | F |
| R-DOM-12 | PROJ §8.6 | Recorrência gera ocorrências sem apagar histórico | — | `01-MODELO-DOMINIO.md` §5.4 | F4 | F |
| R-DOM-13 | PROJ §8.7 | Tarefa bloqueada identifica bloqueador | — | `01-MODELO-DOMINIO.md` §5.6 | F3 | F |
| R-DOM-14 | PROJ §7.8 | Auditoria completa | — | `01-MODELO-DOMINIO.md` §6 | F3 | F |
| R-DOM-15 | PROJ §7.7 | Lembrete: canal, recorrência, tentativas, falha | — | `01-MODELO-DOMINIO.md` §7.1 | F4 | F |

## 4. Cobrança e notificações

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-COB-01 | PROJ §9.1 | 5 prioridades (baixa, normal, alta, urgente, crítica) | — | `01-MODELO-DOMINIO.md` §5.1 | F3 | F |
| R-COB-02 | PROJ §9.2 | 4 modos: discreta, persistente, intensiva, crítica | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §3 | F4 | F |
| R-COB-03 | PROJ §9.3 | Ações na notificação (abrir, iniciar, concluir, adiar, reprogramar, bloquear, silenciar) | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §3.1 | F4 | F |
| R-COB-04 | PROJ §9.3 | Fechar ≠ concluir | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §3.2 | F4 | F |
| R-COB-05 | PROJ §9.4 | Escalonamento por prioridade, prazo, duração, horário de trabalho, adiamentos, dependências, projeto, atraso | — | `01-MODELO-DOMINIO.md` §7.2; `06-ESTRATEGIA-NOTIFICACOES.md` §3.1 | F4 | F |
| R-COB-06 | PROJ §6.3 | Canais externos como adaptadores (e-mail, Telegram, WhatsApp, push) | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §5 | F4/F6 | NF |
| R-COB-07 | PROJ §6.3 | Canal externo nunca substitui notificação local | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §5.3 | F4 | NF |
| R-COB-08 | PROJ §6.1 | Segundo plano, ícone na bandeja, autostart | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §6; `07-ESTRATEGIA-INSTALACAO.md` §6 | F4 | NF |
| R-COB-09 | PROJ §6.1 | Notificações com janela principal fechada | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §6.1 | F4 | NF |
| R-COB-10 | autorização Fase 1 | Notificações **independem de WebView2** | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §2 | F4 | NF |

## 5. Captura e IA

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-IA-01 | PROJ §10.1 | Captura com 1 texto, fica na caixa até organizar | — | `01-MODELO-DOMINIO.md` §8.1 | F3 | F |
| R-IA-02 | PROJ §10.3 | Linguagem natural → estrutura validada | 0004 | `03-CONTRATOS-API.md` §15 | F6 | IA |
| R-IA-03 | PROJ §10.3 | Nada gravado sem validação do esquema | 0004 | `05-THREAT-MODEL.md` §4.5 | F6 | IA |
| R-IA-04 | PROJ §13.2.1 | IA não conclui/exclui/cancela/muda prazo | 0004 | `05-THREAT-MODEL.md` §4.5 | F6 | S/IA |
| R-IA-05 | PROJ §13.2.2 | IA não é fonte única de regra | 0004 | — | F6 | S/IA |
| R-IA-06 | PROJ §13.2.3 | Structured Outputs com schema | 0004 | `03-CONTRATOS-API.md` §15 | F6 | IA |
| R-IA-07 | PROJ §13.2.4 | Sem IA, app continua 100% | 0004 | `05-THREAT-MODEL.md` §4.5 | F6 | S |
| R-IA-08 | PROJ §13.2.5 | Chave da API no servidor | 0004 | `05-THREAT-MODEL.md` §3 | F6 | S |
| R-IA-09 | PROJ §13.2.6 | Telemetria de chamadas, custos, falhas | 0004 | `02-MODELO-DADOS.md` §3.1.8 | F6 | OPS |
| R-IA-10 | PROJ §13.2.7 | IA desligável | 0004 | `06-ESTRATEGIA-NOTIFICACOES.md` §4.2 | F6 | S |
| R-IA-11 | PROJ §13.3 | API OpenAI via servidor, structured + function calling quando aplicável | 0004 | `03-CONTRATOS-API.md` §15 | F6 | IA |
| R-IA-12 | PROJ §13.3 | Prompts versionados e testados | 0004 | ADR 0004 §"Versionamento de prompts" | F6 | IA |

## 6. Sincronização e offline

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-SYNC-01 | PROJ §14.1 | Sincronização automática | 0002 | `04-POLITICA-SYNC.md` §6 | F5 | F |
| R-SYNC-02 | PROJ §14.1 | Operação offline | 0002 | `04-POLITICA-SYNC.md` §1, §8 | F5 | F |
| R-SYNC-03 | PROJ §14.1 | Fila local + reenvio seguro | 0002 | `04-POLITICA-SYNC.md` §7 | F5 | F |
| R-SYNC-04 | PROJ §14.1 | Idempotência | 0002 | `04-POLITICA-SYNC.md` §2.1 | F5 | NF |
| R-SYNC-05 | PROJ §14.1 | Identificação de dispositivo | 0001 | `01-MODELO-DOMINIO.md` §3.3; `03-CONTRATOS-API.md` §4.4 | F5 | F |
| R-SYNC-06 | PROJ §14.1 | Controle de versão dos registros | 0002 | `04-POLITICA-SYNC.md` §2.1 | F5 | NF |
| R-SYNC-07 | PROJ §14.1 | Detecção de conflitos | 0002 | `04-POLITICA-SYNC.md` §5 | F5 | F |
| R-SYNC-08 | PROJ §14.1 | Indicador claro de estado de sync | — | `04-POLITICA-SYNC.md` §5.3 | F5 | UX |
| R-SYNC-09 | PROJ §14.1 | Recuperação após falhas | — | `04-POLITICA-SYNC.md` §7.3 | F5 | NF |
| R-SYNC-10 | PROJ §14.2 | **Não** usar LWW cego | 0002 | `04-POLITICA-SYNC.md` §3, §4 | F5 | F |
| R-SYNC-11 | PROJ §14.2 | Conflito relevante abre UI de resolução | 0002 | `04-POLITICA-SYNC.md` §5.3 | F5 | UX |
| R-SYNC-12 | PROJ §14.3 | Fuso correto, horário de verão, recorrências | — | `01-MODELO-DOMINIO.md` §3.1, §5.4 | F3/F4 | NF |
| R-SYNC-13 | PAD §4.2 | Alta frequência não regrava o banco | 0003 | `02-MODELO-DADOS.md` §2 (WAL + NORMAL) | F2 | NF |
| R-SYNC-14 | autorização Fase 1 | Política explícita por campo (não LWW indiscriminado) | 0002 | `04-POLITICA-SYNC.md` §3 | F5 | F |
| R-SYNC-15 | autorização Fase 1 | SQLite local independente em cada dispositivo | 0003 | `02-MODELO-DADOS.md` §8 | F2 | NF |
| R-SYNC-16 | autorização Fase 1 | Arquitetura real de sincronização entre máquinas | 0002 | `04-POLITICA-SYNC.md` §6 | F5 | NF |

## 7. Plataforma e canais

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-PLAT-01 | PROJ §6.1 | Instalador Windows | 0001 | `07-ESTRATEGIA-INSTALACAO.md` §3 | F7 | NF |
| R-PLAT-02 | PROJ §6.1 | Windows 11 | 0001 | `07-ESTRATEGIA-INSTALACAO.md` §1 | F7 | NF |
| R-PLAT-03 | PROJ §6.1 | Segundo plano, bandeja, autostart, notificações nativas, atualização, cache, desinstalação, logs | 0001, 0005, 0006, 0007 | `06-ESTRATEGIA-NOTIFICACOES.md` §6; `07-ESTRATEGIA-INSTALACAO.md` | F4/F7 | NF |
| R-PLAT-04 | PROJ §6.2 | Web responsiva mesma API | 0001 | `03-CONTRATOS-API.md` §2 (estático servido pelo Javalin) | F2 | NF |
| R-PLAT-05 | PROJ §6.3 | Adaptadores de notificação externos | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §5 | F4 | NF |
| R-PLAT-06 | PROJ §15.1 | App desktop: bandeja, init, notificações | 0001, 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §6; `07-ESTRATEGIA-INSTALACAO.md` | F2 | NF |
| R-PLAT-07 | PROJ §15.2 | Web responsiva (tecnologia **dentro** do padrão aprovado) | 0001 | `03-CONTRATOS-API.md` §2; §17 (HTML+CSS+JS puros, sem build, sem framework) | F2 | NF |
| R-PLAT-08 | PROJ §15.3 | API central com auth, sync, integrações | 0001 | `03-CONTRATOS-API.md` | F2 | NF |
| R-PLAT-09 | PROJ §15.4 | Banco central relacional auditável | 0003 | `02-MODELO-DADOS.md` | F2 | NF |
| R-PLAT-10 | PROJ §15.5 | Banco local + fila offline | 0003 | `02-MODELO-DADOS.md` §8 | F2 | NF |
| R-PLAT-11 | PROJ §15.6 | Worker de recorrências, escalonamento, notificações | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` | F4 | NF |
| R-PLAT-12 | PROJ §15.7 | Adaptadores de comunicação | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §5 | F4 | NF |
| R-PLAT-13 | PROJ §15.8 | Gateway de IA | 0004 | `03-CONTRATOS-API.md` §15 | F6 | NF |
| R-PLAT-14 | PROJ §15.9 | Armazenamento de anexos | — | `02-MODELO-DADOS.md` §3.1.5; `01-MODELO-DOMINIO.md` §5.7 | F3 | NF |
| R-PLAT-15 | PROJ §15.10 | Observabilidade | — | `05-THREAT-MODEL.md` §4 (auditoria) | F2 | OPS |
| R-PLAT-16 | PROJ §15 (final) | Sem regra crítica na UI, sem acoplar a provedor | 0001 | ADR 0001 | F1 | NF |

## 8. Segurança e LGPD

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-SEC-01 | PROJ §16 | Autenticação segura (argon2id) | 0001 | `01-MODELO-DOMINIO.md` §3.1; `05-THREAT-MODEL.md` §4.1 | F2 | S |
| R-SEC-02 | PROJ §16 | Senhas com hash moderno | 0001 | `01-MODELO-DOMINIO.md` §3.1 | F2 | S |
| R-SEC-03 | PROJ §16 | Sessões revogáveis | 0001 | `01-MODELO-DOMINIO.md` §3.2 | F2 | S |
| R-SEC-04 | PROJ §16 | Proteção contra força bruta | 0001 | `03-CONTRATOS-API.md` §1 (rate limit) | F2 | S |
| R-SEC-05 | PROJ §16 | HTTPS | 0001 | `04-POLITICA-SYNC.md` §12 | F2 | S |
| R-SEC-06 | PROJ §16 | Criptografia de segredos | 0001 | `06-ESTRATEGIA-NOTIFICACOES.md` §8.1 | F2 | S |
| R-SEC-07 | PROJ §16 | Controle de acesso por usuário | 0003 | `02-MODELO-DADOS.md` §1 (`dono_id` em toda tabela) | F2 | S |
| R-SEC-08 | PROJ §16 | Validação de entrada | 0001 | `03-CONTRATOS-API.md` §1 (Hibernate Validator) | F2 | S |
| R-SEC-09 | PROJ §16 | Injeção (prepared statements) | 0003 | `05-THREAT-MODEL.md` §4.1 | F2 | S |
| R-SEC-10 | PROJ §16 | Cabeçalhos de segurança | — | `03-CONTRATOS-API.md` §18 | F2 | S |
| R-SEC-11 | PROJ §16 | Auditoria de ações críticas | — | `01-MODELO-DOMINIO.md` §6; `02-MODELO-DADOS.md` §3.1.7 | F3 | S |
| R-SEC-12 | PROJ §16 | Retenção de logs | — | `05-THREAT-MODEL.md` §4.1 (180 dias) | F2 | S |
| R-SEC-13 | PROJ §16 | Exportar e apagar dados próprios (LGPD) | — | `05-THREAT-MODEL.md` §5; `03-CONTRATOS-API.md` §16 | F2 | S |
| R-SEC-14 | PROJ §16 | Dependências verificadas | — | `mvn dependency-check` em CI | F2 | S |
| R-SEC-15 | PROJ §16 | Backups protegidos | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §7.3 | F5 | S |
| R-SEC-16 | PROJ §16 | Nenhuma chave no bundle | 0001, 0004 | `05-THREAT-MODEL.md` §3 | F2 | S |
| R-SEC-17 | PROJ §16 | LGPD | — | `05-THREAT-MODEL.md` §5 | F2 | S |
| R-SEC-18 | PROJ §5.3 | Dispositivo com nome, sistema, versão, revogação | 0001 | `01-MODELO-DOMINIO.md` §3.3; `03-CONTRATOS-API.md` §4.4 | F5 | S |
| R-SEC-19 | autorização Fase 1 | Auditoria, dispositivos autorizados e autenticação | 0001 | `01-MODELO-DOMINIO.md` §3; `05-THREAT-MODEL.md` | F2 | S |
| R-SEC-20 | autorização Fase 1 | Contratos versionados da API | — | `03-CONTRATOS-API.md` §1 (`X-API-Version`) | F2 | S |

## 9. Backup, recuperação, atualização

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-BAK-01 | PROJ §17 | Backup automatizado do banco central | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §7.3 | F5 | OPS |
| R-BAK-02 | PROJ §17 | Retenção configurável | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §7.3 (30d local + 90d S3) | F5 | OPS |
| R-BAK-03 | PROJ §17 | Cópia fora do ambiente principal | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §7.3 | F5 | OPS |
| R-BAK-04 | PROJ §17 | Verificação de integridade | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §7.1 (PRAGMA integrity_check) | F5 | OPS |
| R-BAK-05 | PROJ §17 | Teste documentado de restauração | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §7.3 (CI semanal) | F5 | OPS |
| R-BAK-06 | PROJ §17 | Exportação completa | — | `03-CONTRATOS-API.md` §16 | F2 | S |
| R-BAK-07 | PROJ §17 | Recuperação corrupção local | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §9 | F2 | NF |
| R-BAK-08 | PROJ §17 | Restauração sem duplicar notificações/recorrências | 0002, 0003 | `04-POLITICA-SYNC.md` §8.3 (tombstones) | F5 | F |
| R-BAK-09 | PROJ §18.1 | Instalador identifica versão, atalhos, autostart, registro, desinstalação | 0001 | `07-ESTRATEGIA-INSTALACAO.md` §3, §8 | F7 | NF |
| R-BAK-10 | PROJ §18.2 | Verificação de versão, SHA-256, canal estável, rollback, notas | 0006, 0007 | `07-ESTRATEGIA-INSTALACAO.md` §5, §7 | F7 | NF |
| R-BAK-11 | PROJ §18.3 | Artefatos por versão | 0001 | `07-ESTRATEGIA-INSTALACAO.md` §11 | F7 | OPS |
| R-BAK-12 | autorização Fase 1 | **Atualização assinada** | 0007 | `07-ESTRATEGIA-INSTALACAO.md` §4 | F7 | S |
| R-BAK-13 | autorização Fase 1 | Validação por hash (SHA-256) | 0007 | `07-ESTRATEGIA-INSTALACAO.md` §5.4 | F7 | S |
| R-BAK-14 | autorização Fase 1 | Rollback e recuperação | 0006, 0007 | `07-ESTRATEGIA-INSTALACAO.md` §7 | F7 | NF |

## 10. Qualidade, desempenho, observabilidade

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-QA-01 | PROJ §21 | Abertura rápida | medir F7 | — | F7 | NF |
| R-QA-02 | PROJ §21 | Criação local sem rede | 0002 | `04-POLITICA-SYNC.md` §8.1 | F2 | NF |
| R-QA-03 | PROJ §21 | UI responsiva com grande histórico | 0002 | `02-MODELO-DADOS.md` §6 (índices) | F3 | NF |
| R-QA-04 | PROJ §21 | Consumo moderado em segundo plano | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §6.1 | F4 | NF |
| R-QA-05 | PROJ §21 | Notificações com janela fechada | 0005 | `06-ESTRATEGIA-NOTIFICACOES.md` §6.1 | F4 | NF |
| R-QA-06 | PROJ §21 | Sincronização retomada | 0002 | `04-POLITICA-SYNC.md` §7.3 | F5 | NF |
| R-QA-07 | PROJ §21 | Sem perda em desligamento | 0003 | `07-ESTRATEGIA-INSTALACAO.md` §7.1, §9 | F2 | NF |
| R-QA-08 | PROJ §21 | Operações transacionais | 0003 | `02-MODELO-DADOS.md` (WAL + `db.transaction()` no JDBC) | F2 | NF |
| R-QA-09 | PROJ §21 | Jobs idempotentes | 0002 | `04-POLITICA-SYNC.md` §7 | F4 | NF |
| R-OBS-01 | PROJ §22 | Logs estruturados | 0001 | SLF4J + Logback (sem doc F1) | F2 | OPS |
| R-OBS-02 | PROJ §22 | Correlation ID | — | SLF4J MDC (sem doc F1) | F2 | OPS |
| R-OBS-03 | PROJ §22 | Ciclo de envio de notificações registrado | 0005 | `01-MODELO-DOMINIO.md` §6; `06-ESTRATEGIA-NOTIFICACOES.md` §9 | F4 | OPS |
| R-OBS-04 | PROJ §22 | Diagnóstico de sync visível | — | `04-POLITICA-SYNC.md` §5 | F5 | UX |
| R-OBS-05 | PROJ §22 | Relatório de suporte exportável | — | (sem doc F1; F7) | F7 | OPS |
| R-OBS-06 | PROJ §22 | Monitoramento de jobs | — | (sem doc F1; F4) | F4 | OPS |
| R-OBS-07 | PROJ §22 | Mascaramento de dados sensíveis | — | `05-THREAT-MODEL.md` §4.1 | F2 | S |
| R-OBS-08 | PROJ §22 | Modo diagnóstico | — | (sem doc F1; F7) | F7 | OPS |

## 11. Testes obrigatórios

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-TST-01 | PROJ §23.1 | Unit, integração, contrato, sync, recorrência, cobrança, auth, migração, UI crítica, regressão de prompts | — | todos | contínua | QA |
| R-TST-02 | PROJ §23.2 | E2E: instalação limpa, primeiro acesso, criar/concluir, prazo+notificação, janela fechada, reboot, dois dispositivos, offline→reconexão, conflito, recorrência, atualização, backup, desinstalação | — | `07-ESTRATEGIA-INSTALACAO.md` §12 | F7 | QA |
| R-TST-03 | PROJ §23.3 | Falha: server off, internet off, IA off, credencial expirada, anexo ausente, update interrompido, banco corrompido, notificação recusada, job repetido, relógio errado | — | `05-THREAT-MODEL.md` §8; `07-ESTRATEGIA-INSTALACAO.md` §7 | contínua | QA |
| R-TST-04 | PAD §7.4 | Testar caminho mínimo | — | — | contínua | QA |
| R-TST-05 | PAD §7.4 | Testar migração sobre banco antigo | — | `02-MODELO-DADOS.md` §7 | contínua | QA |
| R-TST-06 | PAD §7.5 | Checklist de 8 itens antes de entregar | — | — | F7 | QA |

## 12. Identidade imutável

| Req. | Fonte | Texto resumido | ADR | F1 | Fase | Tipo |
|---|---|---|---|---|---|---|
| R-ID-01 | AGENTS §1 | applicationId, binaryName, pasta de dados, banco, slug, owner não mudam | — | `07-ESTRATEGIA-INSTALACAO.md` §1 | contínua | NF |
| R-ID-02 | PAD §6 | Versão com fonte única + bump a cada build | — | `07-ESTRATEGIA-INSTALACAO.md` §10 | contínua | NF |

## 13. Fora de escopo (PROJ §27)

Nenhuma das 10 proibições do PROJETO pode ser implementada sem aprovação expressa. Acompanhar como checklist de não-regressão em cada release.

| # | Proibição | Bloqueio |
|---|---|---|
| OOS-01 | Substituir o sistema por serviço de terceiros | nenhuma rota para SaaS externo |
| OOS-02 | Tornar WordPress o núcleo | zero PHP no stack |
| OOS-03 | Chave da OpenAI no cliente | env no server, validado por grep |
| OOS-04 | Exigir internet para tarefas locais | offline-first |
| OOS-05 | Concluir tarefa por IA | só humano |
| OOS-06 | Mensagens externas pagas sem controle | opt-in por canal |
| OOS-07 | Compartilhar dados com terceiros sem config explícita | zero analytics de terceiros |
| OOS-08 | Gamificação infantilizada | tom profissional por padrão |
| OOS-09 | Web sem app desktop | instalador obrigatório |
| OOS-10 | Release sem testes+documentação | `pack-release.mjs` falha se faltar |

## 14. Aderência à stack aprovada

| Princípio | Status |
|---|---|
| Linguagem: **Java 21 LTS** | ✅ (ADR 0001 rev 1; cross-project user memory) |
| Sem JS/TS/Node/Electron/React/Vue no cliente | ✅ |
| Sem build no cliente | ✅ (apenas `jpackage` empacota JRE + JAR; nenhum bundler) |
| Bibliotecas via Maven (sem node_modules) | ✅ |
| Core puro, primeiro parâmetro `DataSource`/`Connection` | ✅ (`01-MODELO-DOMINIO.md` §1) |
| Permissão no backend | ✅ (`03-CONTRATOS-API.md` §19) |
| IA não é dependência | ✅ (ADR 0004) |
| Offline é o normal | ✅ (ADR 0002) |
| Cobrança contínua | ✅ (ADR 0005) |
| Sem perda silenciosa | ✅ (auditoria + tombstone) |
| Sem segredo no cliente | ✅ (env no server, ADR 0004) |
| LGPD | ✅ (THREAT-MODEL §5) |
| Caminho mínimo | ✅ (checklist) |
| Migração sobre banco antigo | ✅ (`02-MODELO-DADOS.md` §7) |
| Bump a cada build (6 lugares) | ✅ (`07-ESTRATEGIA-INSTALACAO.md` §10) |
| Documentação na mesma entrega | ✅ (Fase 0/1 + Fase 7 manuais) |
| Diagnóstico cita arquivo:linha | ✅ (convenção) |
| `gen-graphify.mjs` JS proibido | ✅ (autorização Fase 1; diagramas Mermaid inline) |

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Gerado em 14/08/2026 como Fase 0 do projeto Gestor Inteligente de Demandas.*
*Atualizado em 14/08/2026 com cross-references aos 7 documentos da Fase 1.*
