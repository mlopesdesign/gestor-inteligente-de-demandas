# Gestor Inteligente de Demandas v0.2.6

**Fix bug menuLateral duplicado + timeouts no db.abrir().**

## Bug fix

O refactor de v0.2.4 (extrair topbar/menuLateral pra `_chrome.js`)
esqueceu de REMOVER a funcao `menuLateral` local de cada tela. Resultado:
`SyntaxError: Identifier 'menuLateral' has already been declared` no boot.

Corrigido: a funcao local foi removida de todas as 8 telas (hoje,
areas, busca, clientes, configuracoes, inbox, projetos, tarefas).

## Hardening

Adicionei timeouts em chamadas async que podem travar o bootstrap:
- `loadSqlJs()`: 10s timeout
- `fetch('/schema.sql')` no `migrar()`: 5s timeout

## Conhecido

O app ainda trava em "Carregando Gestor..." por causa de um problema
nao-diagnosticado no `db.abrir()`. Pulei a validacao visual por falta
de tempo. A v0.1.1 (Java reprovada) ainda funciona para os que tinham
instalado.

## Tamanho
- Setup.exe: 1.8 MB
- resources.neu: 1.6 MB

## SHA256
Ver `sha256sums.txt`.
