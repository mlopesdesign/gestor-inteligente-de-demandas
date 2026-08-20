# Release Notes — v0.2.39 (20/08/2026)

## FIX CRÍTICO — login de sincronização estava mentindo

O toast "Conectado" aparecia, mas a tela voltava pra "Desconectado" na próxima renderização. 2 dias quebrado.

### Causa raiz

`writeState` em `src/js/backend/core/sync.js:65-75` codificava o JSON em `Uint8Array` (`TextEncoder().encode(...)`) e passava pra `Neutralino.filesystem.writeFile(path, data)`. Em Neutralino.js v6.3.0, esse padrão **grava 0 bytes silenciosamente** — mesmo bug que `db.js` teve em v0.2.10 com o SQLite (corrigido com certutil). O `try/catch` interno engolia a exceção, o `login()` retornava `ok: true`, o toast "Conectado" aparecia, e o `readState` seguinte não achava o arquivo → caía no `emptyState()` → UI renderizava "Desconectado".

**Prova cruzada**: o arquivo `test-write.txt` (10 bytes, escrito manualmente com `writeFile(path, string)`) ESTÁ no disco. Nenhum `sync_state.json` foi criado em 2 dias. String funciona, Uint8Array não.

### O que mudou

1. **`writeState` agora grava string UTF-8 direta** (que `writeFile` aceita confiavelmente) em vez de `Uint8Array`. Cria o diretório `dados/` defensivamente antes.
2. **`readState` usa `readBinaryFile` + `TextDecoder`** (binário cru, sem decodificação UTF-8 implícita), com fallback pra `readFile` se `readBinaryFile` não existir. Aceita string ou ArrayBuffer.
3. **`writeState` não engole mais exceções** — o throw escapa. O `login()` agora tem um gate `if (!reloaded.wp_token) return erro` que falha explicitamente em vez de mentir com `ok: true`.
4. **`update.json` regenerado** com SHA256 e size do `.neu` novo.
5. **User-Agent e `app_versao` em `sync.js` atualizados** pra `0.2.39` (o `bump-version.mjs` não toca nesses por design — fix manual).

### Validação esperada

```powershell
# Após clicar Entrar uma vez no app:
PS> Test-Path 'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'
True

PS> Get-Content 'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'
{
  "wp_url": "https://tools.mlopesdesign.com.br/wp-json/gestor/v1",
  "wp_token": "eyJ0eXAiOiJKV1Q...",  ← token gravado!
  "wp_email": "mlopesdesign@gmail.com",
  "wp_dispositivo_id": "desktop-01hxx...",
  ...
}
```

A aba Sincronização deve mostrar "Conectado" + bolinha verde **e continuar assim após fechar/reabrir o app** (valida que `readState` consegue ler o arquivo persistido).

### Arquivos modificados

- `src/js/backend/core/sync.js` — `readState` (lê binary), `writeState` (grava string, deixa throw escapar), `login` (gate `if (!reloaded.wp_token)`)
- `update.json` — SHA256 + size do `.neu` novo
- 6 lugares sincronizados via `tools/bump-version.mjs 0.2.39`: `neutralino.config.json`, `package.json`, `src/js/app.js`, `src/index.html`, `installer/gestor.nsi`, `update.json`
- User-Agent + `app_versao` em `src/js/backend/core/sync.js` (manual, regra #17)

### SHA

- `resources.neu` (6.317.986 bytes): `10A277CD25BAAA71D18AF83453083C0F52066A03B212D93FB9B5B6241012BBD3`
- `GestorInteligenteDeDemandas-Setup-0.2.39.exe` (5.445.044 bytes): `A72D9BEA59AC996D2242489C80AE9CDDDD8FA78308DA0511C746563CFF1D9FCA`
