## v0.2.39 — FIX login de sincronização mentia (toast "Conectado" + tela "Desconectado")

**2 dias quebrado. Fix crítico agora.**

### O bug

`writeState` em `src/js/backend/core/sync.js:65-75` codificava o JSON em `Uint8Array` e passava pra `Neutralino.filesystem.writeFile()`. Em Neutralino.js v6.3.0 esse padrão grava 0 bytes silenciosamente — mesmo bug que o `db.js` teve em v0.2.10 com o SQLite. O `try/catch` interno engolia a exceção, então o `login()` retornava `ok: true`, o toast "Conectado" aparecia, e o `readState` seguinte não achava o arquivo → tela voltava pra "Desconectado".

### O fix

- `writeState` agora grava string UTF-8 direta (que `writeFile` aceita confiavelmente) em vez de `Uint8Array`. Cria a pasta `dados/` defensivamente.
- `readState` usa `readBinaryFile` + `TextDecoder` (binário RAW, sem decodificação implícita), com fallback pra `readFile`.
- `writeState` não engole mais exceções — throw escapa. `login()` tem gate `if (!reloaded.wp_token) return erro` que falha explicitamente em vez de mentir.
- 6 lugares sincronizados via `bump-version.mjs` + User-Agent e `app_versao` em `sync.js` ajustados manualmente.

### Como validar

1. Abra o app (já está em v0.2.39)
2. Configurações → aba **Sincronização** → coloque email/senha → **Entrar**
3. Deve ver **"Conectado"** com bolinha verde (e continuar assim depois de fechar/reabrir)
4. Verificar arquivo criado:
   ```powershell
   Test-Path 'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'
   # esperado: True
   ```

### SHA

- `resources.neu` (6.317.986 bytes): `10A277CD25BAAA71D18AF83453083C0F52066A03B212D93FB9B5B6241012BBD3`
- `Setup-0.2.39.exe` (5.445.044 bytes): `A72D9BEA59AC996D2242489C80AE9CDDDD8FA78308DA0511C746563CFF1D9FCA`
