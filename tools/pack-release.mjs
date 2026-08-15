#!/usr/bin/env node
// tools/pack-release.mjs — consolida artefatos para uma release
//
// Uso:  node tools/pack-release.mjs [versao]
// Requer: build-installer.ps1 já executado pelo menos uma vez no stamp atual
//
// Saída em release/:
//   GestorInteligenteDeDemandas-<versao>-win-x64.zip   (app-image com JRE embutido)
//   GestorInteligenteDeDemandas-<versao>-resources.zip (apenas resources p/ auto-update)
//   sha256sums.txt                                    (hashes p/ verificação)
//   MANIFEST.md                                       (lista do que está incluso)

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2] || '0.1.0';
const release = join(root, 'release');

if (!existsSync(release)) {
  console.error(`[pack-release] pasta release/ não existe em ${release}`);
  process.exit(1);
}

// Encontra a pasta build-<timestamp> mais recente
const builds = readdirSync(release)
  .filter(n => n.startsWith('build-'))
  .map(n => ({ n, t: statSync(join(release, n)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
if (builds.length === 0) {
  console.error('[pack-release] nenhuma pasta build-<timestamp> encontrada. Rode tools/build-installer.ps1 primeiro.');
  process.exit(1);
}
const buildDir = join(release, builds[0].n);
const appImage = join(buildDir, 'GestorInteligenteDeDemandas');
if (!existsSync(join(appImage, 'GestorInteligenteDeDemandas.exe'))) {
  console.error(`[pack-release] app-image incompleto em ${appImage}`);
  process.exit(1);
}
console.log(`[pack-release] usando build: ${builds[0].n}`);

// 1. ZIP portátil (app-image inteiro)
const zipPortatil = join(release, `GestorInteligenteDeDemandas-${version}-win-x64.zip`);
zipFolder(appImage, zipPortatil);
console.log(`[pack-release] OK portatil: ${zipPortatil} (${(statSync(zipPortatil).size / 1024 / 1024).toFixed(1)} MB)`);

// 2. resources.zip (só o conteúdo p/ auto-update incremental — não usado no MVP)
const resourcesDir = join(appImage, 'app');
if (existsSync(resourcesDir)) {
  const zipResources = join(release, `GestorInteligenteDeDemandas-${version}-resources.zip`);
  zipFolder(resourcesDir, zipResources);
  console.log(`[pack-release] OK resources: ${zipResources} (${(statSync(zipResources).size / 1024 / 1024).toFixed(1)} MB)`);
}

// 3. SHA-256
const hashes = [];
for (const f of [zipPortatil, join(appImage, 'GestorInteligenteDeDemandas.exe')]) {
  if (existsSync(f)) hashes.push({ name: basename(f), path: f, sha256: sha256(f) });
}
const hashTxt = hashes.map(h => `${h.sha256}  ${h.name}`).join('\n') + '\n';
writeFileSync(join(release, 'sha256sums.txt'), hashTxt);
console.log(`[pack-release] OK sha256sums.txt (${hashes.length} arquivos)`);

// 4. MANIFEST
const exe = statSync(join(appImage, 'GestorInteligenteDeDemandas.exe'));
const runtime = join(appImage, 'runtime');
const runtimeSize = existsSync(runtime) ? dirSize(runtime) : 0;
const manifest = `# Release v${version}

## Artefatos

| Arquivo | Tamanho | SHA-256 |
|---|---|---|
${hashes.map(h => `| \`${h.name}\` | ${(statSync(h.path).size / 1024 / 1024).toFixed(1)} MB | \`${h.sha256.slice(0, 16)}…\` |`).join('\n')}

## Estrutura do app-image

- \`GestorInteligenteDeDemandas.exe\` — launcher (${(exe.size / 1024).toFixed(0)} KB)
- \`runtime/\` — JRE 21 LTS embutido (${(runtimeSize / 1024 / 1024).toFixed(1)} MB)
- \`app/desktop-${version}.jar\` — código da aplicação
- \`app/classes/\` — recursos (FXML, CSS, ícone)

## Verificação

\`\`\`
# Baixar artefatos
curl -L -O https://github.com/ml-lopes/gestor-inteligente-de-demandas/releases/download/v${version}/GestorInteligenteDeDemandas-${version}-win-x64.zip

# Conferir hash
curl -L -O https://github.com/ml-lopes/gestor-inteligente-de-demandas/releases/download/v${version}/sha256sums.txt
# Windows (PowerShell):
Get-FileHash GestorInteligenteDeDemandas-${version}-win-x64.zip -Algorithm SHA256
# Deve bater com sha256sums.txt
\`\`\`

## Instalação

1. Extrair o ZIP em uma pasta (ex: \`C:\\Program Files\\GestorInteligenteDeDemandas\`)
2. (Opcional) Criar atalho para \`GestorInteligenteDeDemandas.exe\` no Menu Iniciar
3. Executar pela primeira vez — Windows SmartScreen pode pedir confirmação (MVP sem Authenticode)
4. O app cria \`%APPDATA%\\GestorInteligenteDeDemandas\\gestor_local.db\` no primeiro uso
`;
writeFileSync(join(release, 'MANIFEST.md'), manifest);
console.log(`[pack-release] OK MANIFEST.md`);

console.log('\n[pack-release] Release pronta em release/. Para publicar: gh release create v' + version);

// --- helpers ---

function zipFolder(srcDir, outFile) {
  // Usa Python (mais robusto que Compress-Archive em pastas com permissões parciais)
  const pyCode = `import shutil, os, sys
src = r'''${srcDir}'''
dst = r'''${outFile}'''
if os.path.exists(dst): os.remove(dst)
parent = os.path.dirname(src)
base = os.path.basename(src)
shutil.make_archive(dst[:-4], 'zip', parent, base)
print('zip:', os.path.getsize(dst), 'bytes')`;
  try {
    execFileSync('python', ['-c', pyCode], { stdio: 'inherit' });
  } catch (e) {
    throw new Error('Falha ao zipar: ' + e.message);
  }
}

function sha256(file) {
  const h = createHash('sha256');
  h.update(readFileSync(file));
  return h.digest('hex');
}

function dirSize(dir) {
  let total = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else total += statSync(p).size;
    }
  };
  walk(dir);
  return total;
}
