# Manual do Usuário — Gestor Inteligente de Demandas v0.1.0

> Filosofia: **cobrança é contínua até decisão explícita**. Você não precisa
> reabrir o app todo dia para saber o que tem pendente — o app te avisa.

---

## Conceito: tarefa ≠ compromisso

| Tipo | O que é | Exemplos |
|---|---|---|
| **Tarefa** | Algo para fazer, tem dono, tem prazo | "Ligar para cliente X", "Pagar boleto" |
| **Compromisso** (futuro) | Evento na agenda, hora marcada | "Reunião 14h com fornecedor" |
| **Lembrete** | Notificação em momento específico | "Lembrar de comprar pão 17h" |

No MVP, **tarefas e compromissos** são unificados em **tarefas** com `vencimento_em`.
A versão 0.2 separará em duas entidades distintas (issue #1).

---

## A janela principal

```
┌──────────────────────────────────────────────────────────────┐
│  Gestor  v0.1.0                          ● online   [Atual]  │
│  Filtros: [Status ▾] [Prioridade ▾] [Buscar...]              │
├──────────────────────────────────────────┬───────────────────┤
│  Hoje, 14/08/2026                        │ Detalhes          │
│  ┌──────┬─────────┬───┬───┬─────┬─────┐  │ Título da tarefa  │
│  │Status│ Título  │Prio│Nível│Venc│Atu │  │ Status: ...       │
│  ├──────┼─────────┼───┼───┼─────┼─────┤  │ Cobrança: ...     │
│  │ ●    │ Ligar.. │ALT│PER │em 1h│14h │  │                   │
│  │ ◐    │ Atuali. │URG│CRI │há 5h│ 2h │  │ [Concluir]        │
│  │ ...                              │  │ [Adiar] [Cancel]  │
│  └──────┴─────────┴───┴───┴─────┴─────┘  │                   │
│  42 tarefas · 7 vencidas                │ ML Lopes Design   │
└──────────────────────────────────────────┴───────────────────┘
```

### Colunas

- **Status**: `CAIXA_ENTRADA` → `EM_ANDAMENTO` → `CONCLUIDA` (ou ramificações)
- **Prioridade**: `BAIXA` (verde) · `NORMAL` (azul) · `ALTA` (laranja) · `URGENTE` (vermelho) · `CRITICA` (vermelho escuro)
- **Nível**: intensidade da cobrança automática
- **Vencimento**: tempo relativo (em 2h, há 1d, etc.) — vermelho se vencida
- **Atualizado**: quando foi tocada pela última vez

---

## Ações rápidas

### Criar tarefa
Botão **Nova** (canto superior direito) ou `Ctrl+N`:
- Informe o título
- (Opcional) edite prioridade, vencimento, área, cliente

### Concluir
Selecione a tarefa e clique **Concluir** (ou pressione `Enter`).
A tarefa vai para o histórico e libera a contagem de pendentes.

### Adiar
Selecione e clique **Adiar**:
- Sem motivo: só posterga o vencimento
- Tarefa vencida: **exige motivo** (registrado em auditoria)

### Cancelar
Selecione e clique **Cancelar`:
- **Sempre exige motivo** (registrado em auditoria)
- Tarefa some da lista de pendentes; fica em *Arquivadas*

### Reabrir
Tarefa concluída pode voltar a `EM_ANDAMENTO`:
- Botão direito → *Reabrir*
- Exige motivo (ex: "concluí por engano", "cliente pediu mudança")

---

## Cobrança contínua

Quando uma tarefa passa do vencimento, o app **não esquece**. Ele aplica
escalonamento automático:

| Atraso | Nível | Frequência de notificação |
|---|---|---|
| 0-24h | PERSISTENTE | 1x a cada 4h |
| 24-72h | INTENSIVA | 1x por hora |
| >72h | CRITICA | 1x a cada 15min |
| >limite | BLOQUEIO | + status BLOQUEADA + prioridade URGENTE/CRITICA |

Você pode **silenciar fora do horário** (configurável em *Configurações*).

### Pausar cobrança
Se você precisa de silêncio temporário (férias, foco):
- *Configurações → Cobrança → Pausar até* — define uma data
- Após a data, retoma automaticamente

---

## Sincronização

Se você tem o app em mais de um dispositivo (ex: desktop em casa, web no
celular), tudo sincroniza automaticamente.

### Como funciona
- Mudança local → fila offline → push para servidor → servidor aplica e
  retorna novo cursor
- Mudança em outro dispositivo → pull desde cursor → aplica local
- **Conflito** (duas pessoas editando ao mesmo tempo): o app **não escolhe
  silenciosamente**. Abre um diálogo de resolução: você vê ambas as versões
  e decide (manter minha / manter do servidor / mesclar campo a campo)

### O que é local vs servidor
| Dado | Onde fica | Quem vê |
|---|---|---|
| Tarefas | Local + servidor (se logado) | Você em todos os seus dispositivos |
| Auditoria | Servidor | Você (somente leitura) |
| Configurações | Local | Só o dispositivo |
| Senha | Só no servidor (hash argon2id) | Ninguém |

---

## LGPD: seus direitos, garantidos pelo app

| Direito | Onde no app |
|---|---|
| Ver o que o sistema tem sobre você | *Conta → Meus dados* |
| Exportar tudo (portabilidade) | *Conta → Exportar tudo* |
| Apagar tudo (direito ao esquecimento) | *Conta → Apagar conta* |
| Revogar consentimento de IA | *Conta → Privacidade → IA desativada* |
| Ver dispositivos conectados | *Conta → Dispositivos* |
| Revogar um dispositivo | *Conta → Dispositivos → Revogar* |

Exportação gera `.zip` com JSON. Apagar é **real** (hard delete após 30 dias
de carência).

---

## Atalhos de teclado

| Tecla | Ação |
|---|---|
| `Ctrl+N` | Nova tarefa |
| `Enter` | Concluir selecionada |
| `Delete` | Cancelar selecionada (pede motivo) |
| `Ctrl+A` | Adiar selecionada (pede novo prazo) |
| `F5` | Atualizar lista |
| `Ctrl+L` | Focar campo de busca |
| `Ctrl+Q` | Sair (bandeja → Sair) |

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
