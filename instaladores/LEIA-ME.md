# Instaladores do Gestor

Mantém só os **3 últimos builds** de cada produto. Mais antigo vai pra `.obsoleto/`.

## Gestor Desktop (Windows)

| Arquivo | Versão | Notas |
|---|---|---|
| `GestorInteligenteDeDemandas-Setup-0.2.27.exe` | **v0.2.27 (atual)** | Hotfix encoding UTF-8. Use este. |
| `GestorInteligenteDeDemandas-Setup-0.2.26.exe` | v0.2.26 | Aba Sincronização (faltava). Encoding bug. |
| `GestorInteligenteDeDemandas-Setup-0.2.25.exe` | v0.2.25 | Botões de excluir + bulk select. Encoding bug. |

**Como instalar:** clica duas vezes no .exe. Detecta versão anterior e atualiza por cima, mantendo banco e configurações.

## Plugin WordPress (gestor-api)

| Arquivo | Versão | Notas |
|---|---|---|
| `gestor-api-0.1.4.zip` | **v0.1.4 (atual)** | Auth via `wp_users` nativo + capability `gestor_api_use`. Use este. |
| `gestor-api-0.1.3.zip` | v0.1.3 | Fix triggers de auditoria. |
| `gestor-api-0.1.2.zip` | v0.1.2 | Fix PHP 8 fatal `get_item`. |

**Como instalar:** WP Admin → Plugins → Add New → Upload Plugin → selecione o .zip → Install Now → Activate.

## Builds antigos

Tudo mais antigo que os 3 últimos vai pra `.obsoleto/`. Se precisar de uma versão específica, olha lá antes de fazer download do GH.

## Atualização automática do app

O **app desktop** busca novas versões em:
- `https://mlopesdesign.github.io/gestor-inteligente-de-demandas/update.json`

O `update.json` mora na branch `gh-pages` do repo. Quando você publica uma nova release, **atualize o `update.json` lá também** — senão o auto-update não detecta a versão nova.

## Fluxo pra cada release

```powershell
# 1. Bump + build
node tools/bump-version.mjs X.Y.Z
node tools/build.mjs

# 2. Setup.exe (Inno Setup)
& .\tools\innosetup7\ISCC.exe .\installer\gestor.iss

# 3. Copiar pra instaladores/ (atual) + mover 3 mais antigos pra .obsoleto/
Copy-Item installer\GestorInteligenteDeDemandas-Setup-X.Y.Z.exe instaladores\
Move-Item instaladores\GestorInteligenteDeDemandas-Setup-(3 mais antigos).exe instaladores\.obsoleto\ -Force

# 4. Zip do plugin WP (se mudou)
& "C:\tools\php81\php.exe" wp-api\tests\build-zip.php wp-api\gestor-api wp-api\gestor-api-X.Y.Z.zip
Copy-Item wp-api\gestor-api-X.Y.Z.zip instaladores\

# 5. Publicar no GH
gh release create vX.Y.Z --repo mlopesdesign/gestor-inteligente-de-demandas --title "..." --notes-file "..." instaladores\...
gh release create vX.Y.Z --repo mlopesdesign/gestor-api --title "..." --notes-file "..." instaladores\gestor-api-X.Y.Z.zip

# 6. Atualizar update.json no gh-pages
git checkout gh-pages
# editar update.json (versao + sha256 + size)
git add update.json; git commit -m "..."; git push origin gh-pages
git checkout main
```
