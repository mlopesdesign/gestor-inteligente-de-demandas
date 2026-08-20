# v0.2.29 — HOTFIX: sync.js não detectava que estava no app

> Bump de **patch** (v0.2.28 → v0.2.29).

## O bug

A função `detectNoApp()` do `src/js/backend/core/sync.js` checava `window.NL_CORS` e `window.NL_PORT`. Essas globais são injetadas pelo `/__neutralino_globals.js`, que roda quando o HTML é parseado. **Mas** o `sync.js` é importado pelo `app.js` (módulo defer), que roda **depois**. Resultado: quando `detectNoApp()` executa, as globais ainda não existem → `NO_APP = true` → sync bloqueia com erro `"Recurso disponível apenas no app"`.

Esse erro apareceu na tela "Configurações → Sincronização" mesmo dentro do app, impedindo o login no plugin WP.

## O fix

Trocar a detecção pra `typeof window.Neutralino === 'undefined'` (mesma do `ambiente.js:18`, que funciona). O objeto `window.Neutralino` é criado pelo `neutralino.js` (clássico, sem defer), que sempre carrega antes do módulo defer.

```js
// antes:
function detectNoApp() {
  return typeof window === 'undefined' || !window.NL_CORS || !window.NL_PORT;
}

// depois:
function detectNoApp() {
  return typeof window === 'undefined' || typeof window.Neutralino === 'undefined';
}
```

## Mudanças

- 1 arquivo: `src/js/backend/core/sync.js` (5 linhas)
- Bump em 5 lugares (package, neutralino.config, app.js fallback, index.html meta, gestor.iss)

## Testes

17/17 verde. Fix puramente runtime detection.

## Como atualizar

- **Setup.exe direto**: `instaladores\GestorInteligenteDeDemandas-Setup-0.2.29.exe`
- **GH**: https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.29

## Compatibilidade

- v0.1.4 do plugin WP não muda
- App Android não muda
- Banco preservado
