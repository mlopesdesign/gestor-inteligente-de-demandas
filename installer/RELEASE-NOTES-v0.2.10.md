# v0.2.10 — Correção crítica do banco

**Linha do tempo:** 14/08 → 17/08/2026

## O bug

A tela **Projetos** mostrava "Nenhum projeto" mesmo com 4 projetos reais (do Marcio) no banco.

Causa raiz: o Neutralino.filesystem.readFile() retorna os bytes como **string UTF-8** decodificada, não como Uint8Array. O 
ew Uint8Array(data) criava um array de **0 bytes** a partir de uma string de 286708 chars. O sql.js recebia banco vazio → criava schema novo → semearDemo() → mostrava 5 tarefas demo em vez das 12 reais.

O **erro foi silencioso** porque o diag em __dbg localStorage do WebView2 só flushava no leveldb após alguns minutos, e o app mostrava "5 tarefas ativas" (do semearDemo) em vez de "12" (do Marcio).

## A correção

1. Trocar eadFile por eadBinaryFile (retorna ArrayBuffer cru).
2. Converter para Uint8Array corretamente (
ew Uint8Array(data) de ArrayBuffer).
3. gravarNoDisco reescrito pra usar certutil -decode (writeFile direto também tem o bug de 0 bytes pra binário).
4. Adicionado diag persistente em logs/db.log via Neutralino.os.execCommand (persiste mesmo após crash do WebView2).

## Validação visual

- **Hoje**: 12 tarefas ativas do Marcio (Cenário Alagoas, Recanto, IML, Cacique).
- **Tarefas**: tabela com 12 linhas, projetos, áreas, datas relativas.
- **Projetos**: 4 cards do Marcio (Site Cenário Alagoas, Identidade visual Recanto, Landing page Cacique, App IML Mobile).
- **Clientes**: 4 contatos (Ana Paula, Bruno Costa, Carla Mendes, Diego Rocha).
- **Áreas**: 3 áreas (Comercial, Desenvolvimento, Design).
- **Caixa de entrada**: tarefa de captura rápida.
- **Configurações**: 12 tarefas / 4 projetos / 4 clientes / 3 áreas + LGPD.

## Outras mudanças

- Schema corrigido em core/projetos.js e core/clientes.js pra usar im_em/inicio_em/contatos_json/status em vez de colunas antigas.
- Versão no header de todas as 7 telas usando <meta name="app-version"> (fallback chain: meta → NEUTRALINO_GLOBALS → localStorage → '0.2.10').
- Emojis decorativos removidos da tela de configurações.
- Loading screen e login com fundo preto.
- Ícone MLOPES DEV no .exe (via cedit-x64.exe).
- Auto-update checado contra update.json no GitHub Pages com fallback chain de versão (corrige bug "mostrar updante na mesma versão").
- enableInspector: false em release (DevTools não abre sozinho).

## Hashes

- Setup.exe: SHA256 a calcular
- resources.neu: ~12 MB

## Instalação

Baixar GestorInteligenteDeDemandas-Setup-0.2.10.exe (~5.6 MB), rodar como administrador. Auto-update cuida do resto.
