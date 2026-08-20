## v0.2.37 - FIX meta app-version + auto-update

**Causa raiz 1 (v0.2.35 vs 0.2.36 no header):** `src/index.html` tinha `app-version=0.2.35` mesmo rodando 0.2.36 (meta tag desatualizada). O `app.js:121-123` le a meta tag PRIMEIRO. Resultado: app mostrava "v0.2.35" no header mesmo com `neutralino.config.json=0.2.36`.

**Causa raiz 2 (auto-update nao funciona):** O `aplicarAtualizacao` (em `src/js/app.js`) substituia so o `resources.neu`. MAS o Neutralino serve `src/` direto do disco. Resultado: `src/` ficava na versao antiga ate reinstalar via `INSTALAR-AGORA.exe`. O usuario via "Nova versao 0.2.36 disponivel" no app v0.2.35, clicava Atualizar, o `.neu` era substituido, mas o app continuava mostrando v0.2.35 porque o `src/` nao mudou.

**Fix 1:** `src/index.html` atualizado pra 0.2.37.

**Fix 2:** `aplicarAtualizacao` agora extrai `src/` de dentro do `resources.neu` novo (formato ASAR-like: 4 ints LE + JSON header + arquivos concatenados) e sobrescreve `src/` no disco. Tudo num unico `execCommand` PowerShell. Proximas atualizacoes propagam codigo novo.

**Validacao:** nas v0.2.34-v0.2.36 o auto-update NAO propagava `src/`. v0.2.37 corrige.

Detalhes: `installer/RELEASE-NOTES-v0.2.37.md`