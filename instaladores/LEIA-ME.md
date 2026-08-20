# Instaladores do Gestor

Todos os instaladores/release artifacts ficam aqui. Baixe e execute.

## Gestor Desktop (Windows)

| Arquivo | Versão | Notas |
|---|---|---|
| `GestorInteligenteDeDemandas-Setup-0.2.27.exe` | **v0.2.27 (atual)** | Hotfix encoding UTF-8. Use este. |
| `GestorInteligenteDeDemandas-Setup-0.2.26.exe` | v0.2.26 | Tinha o bug de encoding. NÃO use. |
| `GestorInteligenteDeDemandas-Setup-0.2.25.exe` | v0.2.25 | Botões de excluir + bulk select. Encoding bug. |
| `GestorInteligenteDeDemandas-Setup-0.2.24.exe` | v0.2.24 | Sync bidirecional com plugin WP. |
| `GestorInteligenteDeDemandas-Setup-0.2.23.exe` | v0.2.23 | Fix botões de excluir faltando. |
| `GestorInteligenteDeDemandas-Setup-0.2.22.exe` | v0.2.22 | Fix ícone dos atalhos. |
| `GestorInteligenteDeDemandas-Setup-0.2.21.exe` | v0.2.21 | (não publicar) |
| `GestorInteligenteDeDemandas-Setup-0.2.20.exe` | v0.2.20 | (não publicar) |

**Como instalar:** baixe o .exe, execute. Detecta a versão antiga (se houver) e atualiza por cima, mantendo banco e configurações.

## Plugin WordPress (gestor-api)

| Arquivo | Versão | Notas |
|---|---|---|
| `gestor-api-0.1.4.zip` | **v0.1.4 (atual)** | Auth via `wp_users` nativo + capability `gestor_api_use`. Use este. |
| `gestor-api-0.1.3.zip` | v0.1.3 | Fix triggers de auditoria. |
| `gestor-api-0.1.2.zip` | v0.1.2 | Fix PHP 8 fatal `get_item`. |
| `gestor-api-0.1.0-backup.zip` | v0.1.0 | Release inicial (já substituída). |

**Como instalar:** WP Admin → Plugins → Add New → Upload Plugin → selecione o .zip → Install Now → Activate.

## Atualização automática

O **app desktop** busca novas versões em:
- `https://mlopesdesign.github.io/gestor-inteligente-de-demandas/update.json`

O `update.json` mora na branch `gh-pages` do repo. Quando você publica uma nova release, **lembre-se de atualizar o `update.json` lá também** — senão o auto-update não detecta a versão nova.

## Fluxo pra cada release

```powershell
# 1. Bump + build
node tools/bump-version.mjs X.Y.Z
node tools/build.mjs

# 2. Setup.exe (Inno Setup)
& .\tools\innosetup7\ISCC.exe .\installer\gestor.iss

# 3. Copiar pra pasta instaladores
Copy-Item installer\GestorInteligenteDeDemandas-Setup-X.Y.Z.exe instaladores\

# 4. Zip do plugin WP (se mudou)
& "C:\tools\php81\php.exe" wp-api\tests\build-zip.php wp-api\gestor-api wp-api\gestor-api-X.Y.Z.zip
Copy-Item wp-api\gestor-api-X.Y.Z.zip instaladores\

# 5. Publicar
gh release create vX.Y.Z --repo mlopesdesign/gestor-inteligente-de-demandas --title "..." --notes-file "..." instaladores\...
gh release create vX.Y.Z --repo mlopesdesign/gestor-api --title "..." --notes-file "..." instaladores\gestor-api-X.Y.Z.zip

# 6. Atualizar update.json no gh-pages
git checkout gh-pages
# editar update.json com nova versao + sha256 + size
git add update.json; git commit -m "..."; git push origin gh-pages
git checkout main
```
