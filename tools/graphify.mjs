#!/usr/bin/env node
// tools/graphify.mjs — gera GRAPHIFY.md (mapa técnico) lendo src/js/.
// Conforme PADRAO-ML-LOPES-DESIGN.md §7.3 (GRAPHIFY).
//
// Uso:  node tools/graphify.mjs
// Saída: GRAPHIFY.md (raiz do projeto)

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'js');
const docsRoot = join(root, 'docs');

function walk(d) {
  const out = [];
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && p.endsWith('.js')) out.push(p);
  }
  return out;
}

const arquivos = walk(src);
const modulos = {};
const permissoes = new Set();
const canais = new Set();

// Mapeia arquivos -> modulos
for (const f of arquivos) {
  const rel = relative(src, f).replace(/\\/g, '/').replace(/\.js$/, '');
  modulos[rel] = [];
}

// Detecta imports e permissoes
for (const f of arquivos) {
  const rel = relative(src, f).replace(/\\/g, '/').replace(/\.js$/, '');
  const txt = readFileSync(f, 'utf-8');
  // imports
  for (const m of txt.matchAll(/from\s+['"](.+?)['"]/g)) {
    const dep = m[1].replace(/^\.\//, '').replace(/\.js$/, '');
    if (modulos[dep]) modulos[rel].push(dep);
  }
  // canais (entre aspas, ex: 'auth:login')
  for (const m of txt.matchAll(/['"]([a-z]+:[a-z_]+)['"]/g)) {
    const canal = m[1];
    if (!canais.has(canal)) canais.add(canal);
  }
}

// Detecta permissoes no permissoes.js
const permFile = join(src, 'backend', 'permissoes.js');
if (existsSync(permFile)) {
  const txt = readFileSync(permFile, 'utf-8');
  for (const m of txt.matchAll(/'([a-z_]+:[a-z_]+)':\s*'([A-Z_]+)'/g)) {
    permissoes.add(`${m[1]} → ${m[2]}`);
  }
}

// Gera o GRAPHIFY.md
let md = `# GRAPHIFY — Mapa técnico do Gestor Inteligente de Demandas
_Gerado por \`node tools/graphify.mjs\` em ${new Date().toISOString()}_

## Arquitetura (PADRAO §3.1)

\`\`\`
src/
  index.html          ← página única
  css/app.css         ← tema dark/light
  js/
    app.js            ← gateway api() e bootstrap
    telas/            ← uma por área do menu
    vendor/           ← sql-wasm.js, neutralino.js (sem npm no cliente)
    backend/
      servidor.js     ← despacha canal → core/*
      db.js           ← wrapper sql.js
      ambiente.js      ← tudo que toca SO
      permissoes.js   ← mapa PERM_ROTA
      core/           ← regras de negócio PURAS
\`\`\`

## Módulos e dependências

`;

for (const [nome, deps] of Object.entries(modulos)) {
  md += `### \`${nome}\`\n\n`;
  if (deps.length === 0) md += '_Sem dependências internas._\n\n';
  else md += 'Importa: ' + deps.map(d => '`' + d + '`').join(', ') + '\n\n';
}

md += `## Canais expostos pela API (servidor.js)\n\n`;
for (const c of [...canais].sort()) md += `- \`${c}\`\n`;

md += `\n## Permissões por canal (PERM_ROTA)\n\n`;
for (const p of [...permissoes].sort()) md += `- ${p}\n`;

md += `\n## Armadilhas conhecidas (PADRAO §9)\n\n`;
md += `- Sem BOM UTF-8 no \`index.html\`, o WebView2 quebra todos os acentos\n`;
md += `- \`fetch\` para download externo é bloqueado por CORS no WebView2 → usar \`Neutralino.filesystem\` ou PowerShell \`Invoke-WebRequest\`\n`;
md += `- Banco sql.js carrega o .db inteiro na memória → evitar mais de ~50 mil registros\n`;
md += `- Atualização: só oferecer versão MAIOR (a bumps de build sobem patch)\n`;

writeFileSync(join(root, 'GRAPHIFY.md'), md);
console.log('[graphify] GRAPHIFY.md gerado com', Object.keys(modulos).length, 'modulos e', canais.size, 'canais');
