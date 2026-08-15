# Guia Rápido — Gestor Inteligente de Demandas

> 5 minutos para começar.

## 1. Instalar (1 min)

1. Baixe `GestorInteligenteDeDemandas-0.1.0-win-x64.zip` da release
2. Extraia em `C:\Program Files\GestorInteligenteDeDemandas\`
3. Clique em `GestorInteligenteDeDemandas.exe`
4. Aceite o aviso do SmartScreen (*Mais informações → Executar*)

## 2. Criar conta (30 s)

1. *Configurações → Conta → Criar conta* (ou via web em `http://servidor:porta`)
2. Email + senha (8+ chars)
3. Pronto — login local automático, ou login no servidor se configurado

## 3. Criar sua primeira tarefa (15 s)

1. Botão **Nova** (canto superior direito)
2. Título: "Minha primeira tarefa"
3. **Salvar**

Apareceu na lista? Você está pronto.

## 4. Configurar servidor (opcional, 2 min)

Para sincronizar entre dispositivos:

1. Levante o servidor: `java -jar server-0.1.0.jar`
2. No app: *Configurações → Sincronização → URL do servidor* = `http://localhost:7070`
3. Login com mesma conta — tudo sincroniza

## 5. Cobrança contínua (já está ativa)

Tarefa vencida > 72h = **BLOQUEADA + URGENTE + CRITICA** automaticamente.
Para pausar: *Configurações → Cobrança → Pausar até*.

---

## Próximos passos

- 📖 [Manual do Usuário](MANUAL-DO-USUARIO.md) — uso completo
- 🛠 [Manual de Instalação](MANUAL-INSTALACAO.md) — opções avançadas
- 💾 [Manual de Backup e Recuperação](MANUAL-BACKUP-RECUPERACAO.md) — segurança dos dados
- 📋 [Matriz de Rastreabilidade](MATRIZ-RASTREABILIDADE.md) — o que cada componente faz
- 📐 [docs/01-07](.) — especificação técnica completa

---

**Problemas?** `Ctrl+Shift+L` abre o log. Se travar, `bandeja → Reportar problema`
(abre issue no GitHub com stack trace anexado).

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
