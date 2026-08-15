# ML Lopes Design — Gestor Inteligente de Demandas

## Documento Mestre do Projeto

**Status:** Especificação inicial vinculante  
**Versão do documento:** 1.0.0  
**Data:** 14/08/2026  
**Responsável pelo produto:** ML Lopes Design  
**Plataforma principal:** Windows 11  
**Natureza:** Produto profissional, definitivo, instalável e preparado para evolução

---

## 1. Finalidade deste documento

Este documento define o escopo funcional, técnico e operacional do Gestor Inteligente de Demandas da ML Lopes Design. Ele deverá ser tratado como especificação vinculante do produto em conjunto com os demais documentos normativos existentes na raiz do projeto.

Antes de alterar a arquitetura ou implementar código, o agente responsável deverá:

1. Listar e ler integralmente todos os arquivos normativos da raiz.
2. Identificar a hierarquia entre os documentos.
3. Registrar conflitos, lacunas e decisões técnicas.
4. Preservar requisitos já aprovados.
5. Não reduzir este projeto a MVP, protótipo, demonstração ou interface fictícia.
6. Não declarar conclusão sem build, testes e instalador funcional.

---

## 2. Visão do produto

O produto será um sistema pessoal de gestão de tarefas, compromissos, projetos e entregas, criado inicialmente para uso de Lopes em mais de um computador Windows.

O sistema deverá resolver um problema concreto: o acúmulo de demandas de naturezas diferentes, o esquecimento de tarefas e prazos e a falta de acompanhamento persistente até a conclusão real de cada entrega.

Não será apenas uma lista de tarefas. Será um gestor de execução com:

- captura rápida de demandas;
- organização por área, projeto, cliente e contexto;
- planejamento diário, semanal, mensal e anual;
- prazos e horários precisos;
- subtarefas e dependências;
- sincronização entre dispositivos;
- funcionamento local mesmo sem internet;
- notificações persistentes;
- cobrança escalonada;
- confirmação real de entrega;
- histórico de atrasos e adiamentos;
- apoio opcional de inteligência artificial.

O produto deverá ter acabamento visual premium, moderno, limpo, consistente e adequado para uso profissional diário.

---

## 3. Objetivos principais

1. Centralizar todas as demandas em um único sistema confiável.
2. Permitir uso sincronizado no desktop e no laptop.
3. Evitar esquecimentos por meio de notificações persistentes e escalonadas.
4. Manter a cobrança ativa enquanto a tarefa não for concluída, cancelada ou formalmente reprogramada.
5. Permitir cadastramento rápido sem sacrificar o detalhamento.
6. Apresentar de forma clara o que deve ser feito agora, hoje, nesta semana e posteriormente.
7. Detectar excesso de compromissos, conflitos de prazo e tarefas paradas.
8. Funcionar mesmo quando a camada de inteligência artificial estiver indisponível.
9. Proteger os dados por meio de autenticação, criptografia, backup e auditoria.
10. Ser instalável, atualizável, testável e recuperável.

---

## 4. Princípios obrigatórios

### 4.1 Produto completo

O sistema não poderá conter botões sem função, dados simulados em produção, fluxos quebrados, telas meramente ilustrativas ou recursos declarados sem implementação.

### 4.2 IA não será dependência estrutural

Cadastro, consulta, edição, prazos, recorrências, sincronização e notificações deverão funcionar sem a API de inteligência artificial.

### 4.3 Operação local e sincronizada

Cada computador deverá manter uma base local operacional. Alterações serão sincronizadas com o servidor central quando houver conexão.

### 4.4 Sem perda silenciosa de dados

Falhas de sincronização deverão ser registradas, exibidas e recuperáveis. Conflitos não poderão resultar em sobrescrita silenciosa.

### 4.5 Cobrança com decisão explícita

Uma notificação ignorada não poderá equivaler à resolução da tarefa. O sistema deverá continuar cobrando conforme a política aplicável.

### 4.6 Privacidade e segurança

Chaves, senhas e tokens nunca poderão ficar expostos no aplicativo cliente, nos logs ou no repositório.

---

## 5. Perfis e evolução

### 5.1 Uso inicial

O uso inicial será individual, pelo proprietário do sistema, em mais de um dispositivo.

### 5.2 Preparação arquitetural

O modelo de dados deverá possuir identificação de usuário e isolamento de dados, permitindo futura comercialização sem exigir reescrita estrutural. Isso não autoriza implementar complexidade empresarial desnecessária na primeira entrega.

### 5.3 Dispositivos

Cada instalação deverá registrar um dispositivo autorizado, com nome, sistema, versão do aplicativo, último acesso e capacidade de revogação.

---

## 6. Plataformas e canais

### 6.1 Aplicativo Windows

Obrigatório:

- instalador profissional;
- suporte ao Windows 11;
- execução em segundo plano;
- ícone na bandeja do sistema;
- inicialização opcional junto com o Windows;
- notificações nativas;
- atualização segura;
- cache local;
- desinstalação correta;
- logs de diagnóstico sem dados sensíveis.

### 6.2 Aplicação web responsiva

Deverá permitir acesso seguro a partir de navegador desktop ou móvel, compartilhando os mesmos dados e regras do aplicativo Windows.

### 6.3 Canais opcionais de notificação

A arquitetura deverá admitir:

- e-mail;
- Telegram;
- WhatsApp por provedor oficialmente suportado;
- push web ou móvel;
- outros canais futuros por adaptadores desacoplados.

Nenhum canal externo deverá substituir as notificações locais obrigatórias do Windows.

---

## 7. Entidades principais

### 7.1 Usuário

- identidade;
- credenciais e métodos de autenticação;
- preferências;
- fuso horário;
- horário de trabalho;
- políticas de cobrança;
- dispositivos;
- canais de notificação.

### 7.2 Área

Agrupamento amplo e editável, como trabalho, pessoal, fotografia, desenvolvimento, eventos, administração ou impressão 3D. Nenhum nome deverá ser fixado no código.

### 7.3 Cliente ou contato

- nome;
- organização;
- contatos;
- observações;
- projetos associados;
- tarefas associadas;
- status.

### 7.4 Projeto

- título;
- descrição;
- cliente opcional;
- área;
- status;
- prioridade;
- datas de início e término;
- progresso calculado;
- participantes futuros;
- tarefas, arquivos, comentários e histórico.

### 7.5 Tarefa

Campos mínimos:

- título;
- descrição;
- área;
- projeto opcional;
- cliente opcional;
- status;
- prioridade;
- nível de cobrança;
- data e hora de início;
- data e hora de vencimento;
- duração estimada;
- duração realizada;
- recorrência opcional;
- etiquetas;
- checklist;
- subtarefas;
- dependências;
- anexos e links;
- notas;
- lembretes;
- responsável;
- origem do cadastro;
- data de criação e atualização;
- data de conclusão;
- confirmação de entrega;
- histórico de adiamentos;
- motivo de cancelamento ou reprogramação.

### 7.6 Subtarefa e checklist

Deverão possuir ordenação, status, prazo opcional, responsável futuro e registro de conclusão.

### 7.7 Lembrete

- momento programado;
- canal;
- recorrência da cobrança;
- estado de envio;
- tentativas;
- confirmação;
- falha e motivo.

### 7.8 Evento de auditoria

Deverá registrar ações relevantes, incluindo criação, alteração de prazo, adiamento, conclusão, reabertura, cancelamento, sincronização e falhas de notificação.

---

## 8. Estados e ciclo de vida das tarefas

Estados mínimos:

- Caixa de entrada;
- Planejada;
- Em andamento;
- Aguardando terceiro;
- Bloqueada;
- Em revisão;
- Entregue aguardando confirmação;
- Concluída;
- Adiada;
- Cancelada;
- Arquivada.

Regras:

1. Marcar como concluída deverá registrar autor, dispositivo e horário.
2. Quando aplicável, “trabalho executado” e “entrega confirmada” serão ações distintas.
3. Tarefa concluída poderá ser reaberta, preservando o histórico.
4. Cancelamento exigirá motivo.
5. Reprogramação de tarefa vencida exigirá motivo.
6. Tarefas recorrentes deverão gerar ocorrências independentes sem apagar o histórico anterior.
7. Uma tarefa bloqueada deverá identificar o bloqueador.

---

## 9. Prioridades e níveis de cobrança

### 9.1 Prioridade

- Baixa;
- Normal;
- Alta;
- Urgente;
- Crítica.

### 9.2 Modos de cobrança

#### Discreta

Lembretes antecipados e no vencimento, sem interrupção recorrente intensa.

#### Persistente

Repete avisos em intervalos configuráveis até haver uma decisão explícita.

#### Intensiva

Indicada para compromissos importantes. Utiliza avisos mais frequentes, destaque visual e solicitação de ação.

#### Crítica

Mantém cobrança destacada e escalonada até conclusão, reprogramação justificada, bloqueio formal ou cancelamento justificado.

### 9.3 Ações disponíveis na notificação

- Abrir tarefa;
- Iniciar agora;
- Concluir;
- Marcar como entregue;
- Adiar por intervalo curto permitido;
- Reprogramar com justificativa;
- Informar bloqueio;
- Silenciar conforme regra autorizada.

O fechamento da notificação não será interpretado como conclusão nem como cancelamento.

### 9.4 Escalonamento

O motor deverá considerar:

- prioridade;
- proximidade do prazo;
- tempo estimado;
- horário de trabalho;
- número de adiamentos;
- tempo sem progresso;
- dependências;
- criticidade do projeto;
- atraso acumulado.

As regras deverão ser configuráveis e determinísticas. A IA poderá sugerir ajustes, mas não será responsável por disparar notificações essenciais.

---

## 10. Captura e cadastro

### 10.1 Caixa de entrada rápida

Deverá ser possível criar uma tarefa informando apenas um texto. A tarefa permanecerá na caixa de entrada até ser organizada ou confirmada.

### 10.2 Cadastro completo

Todos os campos relevantes deverão estar disponíveis sem obrigar o usuário a preencher informações desnecessárias.

### 10.3 Linguagem natural

Exemplo:

> Entregar as fotos do evento na sexta às 18h. Selecionar na quarta e editar na quinta.

A camada inteligente poderá propor:

- tarefa principal;
- prazo;
- subtarefas;
- datas intermediárias;
- prioridade;
- duração estimada;
- lembretes.

Nada será gravado definitivamente sem validação das informações estruturadas pelo sistema e aplicação das regras do usuário.

### 10.4 Atalhos

Prever:

- atalho global no Windows para captura rápida;
- criação a partir do ícone da bandeja;
- duplicação de tarefa;
- modelos reutilizáveis;
- importação futura de calendário, planilha ou serviços externos.

---

## 11. Planejamento e visualizações

### 11.1 Hoje

Apresentará:

- atrasadas;
- críticas;
- vencendo hoje;
- em andamento;
- bloqueadas;
- aguardando terceiros;
- concluídas no dia.

### 11.2 Próximas ações

Lista priorizada do que deve ser executado, considerando prazo, duração, dependências e prioridade.

### 11.3 Calendário

Visualizações:

- dia;
- semana;
- mês;
- ano;
- agenda cronológica.

### 11.4 Projetos

- lista;
- quadro por status;
- cronograma quando aplicável;
- progresso;
- saúde do projeto;
- marcos;
- riscos e bloqueios.

### 11.5 Busca e filtros

Busca global e filtros combináveis por status, período, prioridade, área, projeto, cliente, etiqueta, atraso, recorrência e nível de cobrança.

### 11.6 Painel

Indicadores úteis, sem transformar o sistema em painel decorativo:

- demandas abertas;
- tarefas atrasadas;
- entregas próximas;
- carga estimada por dia;
- quantidade de adiamentos;
- tarefas paradas;
- taxa de conclusão;
- tempo planejado e realizado;
- projetos em risco.

---

## 12. Revisões operacionais

### 12.1 Abertura do dia

Ao iniciar o primeiro dispositivo do dia, o sistema deverá exibir resumo com:

- tarefas vencidas;
- tarefas do dia;
- prazos próximos;
- bloqueios;
- capacidade estimada;
- conflitos detectados.

### 12.2 Encerramento do dia

Deverá permitir revisar:

- o que foi concluído;
- o que ficou pendente;
- motivos;
- replanejamento necessário;
- compromissos do dia seguinte.

### 12.3 Revisão semanal

Deverá apresentar projetos parados, tarefas sem prazo, tarefas adiadas repetidamente, atrasos e carga da semana seguinte.

---

## 13. Inteligência artificial

### 13.1 Funções autorizadas

- interpretar linguagem natural;
- propor estrutura para tarefas;
- decompor entregas complexas;
- sugerir ordem de execução;
- detectar conflitos e sobrecarga;
- sugerir prazos intermediários;
- resumir pendências;
- identificar tarefas vagas ou sem próxima ação;
- redigir cobranças contextuais;
- responder perguntas sobre os dados autorizados do próprio sistema.

### 13.2 Limites

1. A IA não poderá concluir, excluir, cancelar ou alterar prazos silenciosamente.
2. A IA não será fonte única de regras de negócio.
3. Resultados estruturados deverão ser validados por esquema.
4. A indisponibilidade da API não poderá impedir o funcionamento essencial.
5. A chave da API deverá permanecer no servidor.
6. Chamadas, custos e falhas deverão possuir telemetria controlada.
7. O uso da IA deverá poder ser desligado.

### 13.3 Integração técnica

Usar a API oficial da OpenAI pela camada de servidor, com respostas estruturadas e chamadas de função quando aplicável. Modelo e política de custos deverão ser configuráveis por ambiente, sem fixar segredos ou decisões comerciais no cliente.

Prompts de produção deverão ser versionados e testados. Mudanças de prompt deverão possuir histórico e critérios de regressão.

---

## 14. Sincronização entre dispositivos

### 14.1 Requisitos

- sincronização automática;
- operação offline;
- fila local de alterações;
- reenvio seguro;
- idempotência;
- identificação de dispositivo;
- controle de versão dos registros;
- detecção de conflitos;
- indicador claro do estado de sincronização;
- recuperação após falhas.

### 14.2 Conflitos

Não usar simplesmente “última gravação vence” para todos os casos. A estratégia deverá considerar tipo de campo e risco de perda. Conflitos relevantes deverão apresentar comparação e permitir resolução segura.

### 14.3 Horários

Persistir horários de forma inequívoca, com fuso configurado. Exibir no fuso do usuário e tratar corretamente recorrências, horário de verão e mudanças de localização.

---

## 15. Arquitetura de referência

A arquitetura definitiva somente poderá ser fechada após leitura dos padrões da raiz e pesquisa técnica atualizada. Como direção inicial, o sistema deverá ser dividido em:

1. **Aplicativo Windows:** interface, cache local, bandeja, inicialização e notificações nativas.
2. **Aplicação web:** acesso responsivo e administração do mesmo domínio funcional.
3. **API central:** autenticação, regras de negócio, sincronização e integrações.
4. **Banco relacional central:** fonte consolidada e auditável.
5. **Banco local:** operação offline e fila de sincronização.
6. **Worker de tarefas:** recorrências, escalonamentos e notificações externas.
7. **Adaptadores de comunicação:** e-mail, mensageria e futuros canais.
8. **Gateway de IA:** isolamento da OpenAI, controle de custo, versionamento de prompts e validação.
9. **Armazenamento de arquivos:** anexos com controle de acesso e integridade.
10. **Observabilidade:** logs, métricas, rastreamento de erros e auditoria.

É proibido colocar regras críticas apenas na interface ou acoplar o domínio diretamente a um provedor externo.

---

## 16. Segurança

Requisitos mínimos:

- autenticação segura;
- senhas com algoritmo de hash moderno;
- sessões revogáveis;
- proteção contra força bruta;
- comunicação HTTPS;
- criptografia de segredos;
- controle de acesso por usuário;
- validação de entrada;
- proteção contra injeção e ataques comuns;
- cabeçalhos de segurança;
- auditoria de ações críticas;
- política de retenção de logs;
- exportação e exclusão dos próprios dados;
- dependências verificadas;
- backups protegidos;
- nenhuma chave secreta no aplicativo distribuído.

O desenho deverá observar a LGPD naquilo que for aplicável aos dados armazenados.

---

## 17. Backup e recuperação

- backup automatizado do banco central;
- retenção configurável;
- cópia fora do ambiente principal;
- verificação de integridade;
- teste documentado de restauração;
- exportação completa dos dados do usuário;
- recuperação diante de corrupção local;
- restauração sem duplicar notificações ou recorrências.

Backup existente da VPS não dispensa backup lógico e teste de restauração específico do produto.

---

## 18. Atualização e distribuição

### 18.1 Instalador

O produto final deverá incluir instalador Windows funcional, com:

- identificação da versão;
- atalhos corretos;
- inicialização automática configurável;
- registro correto do aplicativo;
- instalação e atualização preservando dados;
- desinstalação limpa;
- mensagem clara em caso de falha.

### 18.2 Atualização

- verificação de versão;
- pacote assinado quando a infraestrutura permitir;
- validação de integridade;
- canal estável;
- rollback ou recuperação quando a atualização falhar;
- notas de versão.

### 18.3 Artefatos por versão

- instalador;
- código-fonte correspondente;
- notas de versão;
- documentação;
- hashes SHA-256;
- relatório de testes;
- instruções de instalação e recuperação.

---

## 19. Qualidade visual e experiência

O design deverá ser:

- moderno;
- premium;
- clean;
- consistente;
- rápido;
- acessível;
- responsivo;
- com hierarquia visual clara;
- sem excesso de elementos;
- com estados vazios úteis;
- com mensagens de erro acionáveis;
- com tema claro e escuro;
- adequado para períodos longos de uso.

As notificações deverão ser firmes sem usar linguagem ofensiva, infantilizada ou humilhante. O usuário poderá selecionar o tom da cobrança.

Todas as ações críticas deverão informar claramente seu efeito. Fluxos frequentes deverão exigir poucos passos e oferecer atalhos de teclado.

---

## 20. Acessibilidade e internacionalização

- navegação por teclado;
- foco visível;
- contraste adequado;
- suporte a escala do Windows;
- textos legíveis;
- não depender exclusivamente de cor;
- estrutura preparada para tradução;
- português do Brasil como idioma inicial;
- formatos brasileiros de data e hora na apresentação, mantendo persistência técnica inequívoca.

---

## 21. Desempenho e confiabilidade

Metas iniciais a validar:

- abertura rápida do aplicativo;
- criação local de tarefa sem depender da rede;
- interface responsiva com grande histórico;
- consumo moderado em segundo plano;
- notificações disparadas mesmo com a janela principal fechada;
- sincronização retomada automaticamente;
- ausência de perda de dados em desligamento inesperado;
- operações de escrita transacionais;
- jobs idempotentes para evitar notificações duplicadas.

As metas finais deverão ser mensuráveis e registradas após definição da stack.

---

## 22. Observabilidade e suporte

- logs estruturados;
- identificador de correlação;
- registro do ciclo de envio de notificações;
- diagnóstico de sincronização;
- relatório exportável de suporte;
- monitoramento de jobs;
- alertas de falha no servidor;
- mascaramento de dados sensíveis;
- modo de diagnóstico explicitamente ativado.

---

## 23. Testes obrigatórios

### 23.1 Testes automatizados

- unidade;
- integração;
- contratos da API;
- sincronização;
- recorrência;
- regras de cobrança;
- autenticação e autorização;
- migrações de banco;
- componentes críticos da interface;
- regressão dos prompts estruturados de IA.

### 23.2 Testes de ponta a ponta

- instalação limpa;
- primeiro acesso;
- criação e conclusão de tarefa;
- prazo e notificação;
- aplicativo fechado com serviço ativo;
- reinicialização do Windows;
- dois dispositivos alterando dados;
- trabalho offline e reconexão;
- conflito de sincronização;
- tarefa recorrente;
- atualização de versão;
- restauração de backup;
- desinstalação.

### 23.3 Testes de falha

- servidor indisponível;
- internet interrompida;
- API de IA indisponível;
- credencial expirada;
- arquivo anexo ausente;
- atualização interrompida;
- banco local bloqueado ou corrompido;
- notificação recusada pelo Windows;
- job repetido;
- horário do dispositivo incorreto.

---

## 24. Critérios de aceite do produto

O produto somente poderá ser considerado concluído quando:

1. For possível instalar em Windows por instalador final.
2. O aplicativo abrir e permanecer estável.
3. For possível usar a mesma conta em pelo menos dois computadores.
4. Tarefas criadas offline forem sincronizadas posteriormente.
5. Notificações forem disparadas com a janela principal fechada.
6. Tarefas ignoradas continuarem sendo cobradas conforme a regra.
7. Conclusões e reprogramações forem sincronizadas entre dispositivos.
8. A indisponibilidade da IA não interromper recursos essenciais.
9. Backups puderem ser restaurados em teste documentado.
10. Não existirem funções fictícias ou fluxos críticos incompletos.
11. Build, testes automatizados e testes de instalação passarem.
12. Os artefatos finais e seus hashes forem entregues.
13. A documentação de instalação, uso, administração e recuperação estiver completa.
14. A interface tiver passado por revisão visual em resoluções e escalas compatíveis com o Windows.

---

## 25. Fases de execução

As fases representam ordem técnica, não autorização para entregar um produto parcial como resultado final.

### Fase 0 — Governança e descoberta

- leitura integral da raiz;
- inventário de normativos;
- registro de requisitos;
- matriz de rastreabilidade;
- pesquisa do estado da arte;
- riscos;
- decisões arquiteturais documentadas.

### Fase 1 — Especificação e arquitetura

- fluxos completos;
- modelo de domínio;
- modelo de dados;
- contratos;
- política de sincronização;
- threat model;
- estratégia de notificações;
- estratégia de instalação e atualização;
- protótipos visuais apenas como etapa de validação, nunca como entrega final.

### Fase 2 — Fundação técnica

- repositório e automação;
- ambientes;
- banco;
- autenticação;
- API;
- aplicativo Windows;
- web;
- testes e observabilidade.

### Fase 3 — Domínio de tarefas e projetos

- áreas;
- clientes;
- projetos;
- tarefas;
- subtarefas;
- checklists;
- dependências;
- anexos;
- filtros e busca;
- calendários.

### Fase 4 — Motor de cobrança

- lembretes;
- escalonamento;
- recorrências;
- serviço em segundo plano;
- bandeja;
- notificações nativas;
- revisão diária e semanal;
- auditoria.

### Fase 5 — Sincronização e resiliência

- operação offline;
- fila;
- conflitos;
- dois ou mais dispositivos;
- recuperação;
- backups.

### Fase 6 — Inteligência artificial

- captura em linguagem natural;
- decomposição;
- priorização assistida;
- resumos;
- gateway seguro;
- prompts versionados;
- testes de regressão e custos.

### Fase 7 — Acabamento e entrega

- revisão visual completa;
- acessibilidade;
- desempenho;
- segurança;
- testes finais;
- instalador;
- atualizador;
- documentação;
- release;
- hashes;
- homologação em máquinas reais.

---

## 26. Decisões que não poderão ser presumidas

Se não estiverem definidas pelos arquivos normativos, deverão ser propostas tecnicamente e registradas antes da implementação irreversível:

- nome comercial definitivo;
- stack final;
- domínio e endereço do servidor;
- forma de autenticação;
- canais externos inicialmente habilitados;
- provedor de e-mail ou mensageria;
- política de retenção;
- assinatura de código Windows;
- política de cobrança da API;
- possibilidade e regras de comercialização.

O agente deverá fazer recomendação fundamentada. Perguntas ao proprietário serão reservadas a decisões realmente materiais que não possam ser inferidas com segurança.

---

## 27. Fora do escopo sem aprovação expressa

- substituir o sistema por serviço de terceiros;
- tornar WordPress o núcleo do produto;
- armazenar a chave da OpenAI no cliente;
- exigir internet para cadastrar ou consultar tarefas locais;
- concluir tarefas automaticamente por IA;
- enviar mensagens externas pagas sem autorização e controle de custo;
- compartilhar dados com terceiros sem configuração explícita;
- implementar gamificação infantilizada;
- reduzir a entrega a página web sem aplicativo Windows instalável;
- distribuir release sem testes e documentação.

---

## 28. Entregáveis finais

1. Repositório completo e organizado.
2. Código-fonte integral.
3. Aplicativo Windows.
4. Instalador final.
5. Aplicação web responsiva.
6. API e serviços de background.
7. Banco e migrações versionadas.
8. Configuração de implantação.
9. Testes automatizados.
10. Relatório dos testes finais.
11. Documentação técnica.
12. Manual do usuário.
13. Manual de instalação e atualização.
14. Manual de backup e recuperação.
15. Notas da versão.
16. Hashes SHA-256 dos artefatos.
17. Registro das decisões arquiteturais.
18. Inventário de dependências e licenças.

---

## 29. Ordem inicial para o agente executor

Ao receber este projeto, execute a seguinte sequência:

1. Confirme a raiz oficial aberta no ambiente.
2. Liste os arquivos e diretórios sem alterá-los.
3. Leia integralmente todos os documentos normativos.
4. Identifique a hierarquia normativa e eventuais conflitos.
5. Consolide os requisitos em matriz rastreável.
6. Pesquise fontes oficiais atualizadas para stack, segurança, notificações, instalação, atualização, sincronização e OpenAI.
7. Produza a arquitetura definitiva e registros de decisão.
8. Planeje a execução completa com critérios verificáveis.
9. Implemente um passo por vez, preservando tudo que estiver validado.
10. Execute builds e testes continuamente.
11. Corrija falhas até obter release funcional.
12. Entregue o instalador e todos os artefatos previstos neste documento.

---

## 30. Declaração de produto

O Gestor Inteligente de Demandas deverá agir como uma central pessoal de execução: capturar compromissos, organizar trabalho, tornar riscos visíveis e continuar cobrando decisões enquanto uma demanda permanecer aberta.

O valor central do produto não está em registrar tarefas, mas em impedir que tarefas importantes desapareçam no volume diário de trabalho.

