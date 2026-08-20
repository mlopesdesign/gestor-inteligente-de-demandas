# v0.2.30 — HOTFIX CRÍTICO: app crashava no boot (ReferenceError)

> Bump de **patch** (v0.2.29 → v0.2.30).

## O bug

A v0.2.29 estava com o bootstrap quebrado. O `app.js` crashava ao carregar, e **nada do menu abria**.

Causa: na função de bootstrap, a variável é declarada como `let versão` (com acento, linha 119), mas o fix-versao converteu **algumas** atribuições pra `versao` (sem acento, linhas 122, 128, 132, 135), sem reverter a declaração. Resultado: `versao is not defined` no boot → app crashava.

## Diff

```js
// antes (quebrado):
let versão = null;                              // declaração: versão
if (meta && meta.content) versao = meta.content; // atribuição: versao ❌
if (cached) versao = cached;                     // atribuição: versao ❌
localStorage.setItem('__app_version', versao);  // uso: versao ❌
el.textContent = 'v' + versao;                  // uso: versao ❌

// depois (consertado):
let versão = null;                              // declaração: versão
if (meta && meta.content) versão = meta.content; // atribuição: versão ✓
if (cached) versão = cached;                     // atribuição: versão ✓
localStorage.setItem('__app_version', versão);  // uso: versão ✓
el.textContent = 'v' + versão;                  // uso: versão ✓
```

4 linhas trocadas em `src/js/app.js`.

## Lição

**Em JS, declaração e uso de variável têm que ser EXATAMENTE iguais.** O fix-versao anterior foi agressivo demais, convertendo em alguns lugares mas não em outros relacionados. Resultado: variável declarada como `versão` mas usada como `versao` → `ReferenceError`.

Da próxima vez: antes de reverter find/replace global, **rodar o app e ver se não quebra** — eu deveria ter rodado `node tools/run-tests.mjs` E tentado carregar o app antes de publicar a v0.2.29. Os testes passaram, mas eles só testam o BACKEND, não o bootstrap do frontend.

## Como atualizar

- **Setup.exe direto**: `E:\Projetos\LOPES FOCUS\instaladores\GestorInteligenteDeDemandas-Setup-0.2.30.exe`
- **GH**: https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.30

## Testes

17/17 verde (mas testes não pegam esse tipo de erro — é runtime no browser).

## Compatibilidade

- v0.1.4 do plugin WP não muda
- Banco preservado
- Sessão do sync preservada
