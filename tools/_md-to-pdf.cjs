// tools/_md-to-pdf.cjs — converte MANUAL-*.md / GUIA-*.md em PDF PREMIUM
// Capa + sumario + paginacao + fontes serif + caixas tipograficas.
// Usa markdown-it (Markdown -> HTML) + puppeteer-core + Edge.
// 100% gratis, sem dependencia externa alem do Edge do Windows.

const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// =============================================================================
// CSS PREMIUM
// =============================================================================
const CSS = `
@page {
  size: A4;
  margin: 0;
  /* Cada secao: 1a pagina com header/footer full, demais com offset */
}
@page :first {
  margin: 0;
}

* { box-sizing: border-box; }

body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
  margin: 0;
  padding: 0;
}

/* =================== CAPA =================== */
.capa {
  page-break-after: always;
  width: 210mm;
  height: 297mm;
  padding: 0;
  margin: 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  page-break-after: always;
  page-break-inside: avoid;
}
.capa-barra-lateral {
  position: absolute;
  top: 0;
  left: 0;
  width: 12mm;
  height: 100%;
  background: linear-gradient(180deg, #f0a000 0%, #ffb420 100%);
}
.capa-logo {
  width: 110mm;
  height: auto;
  margin-bottom: 24mm;
  filter: drop-shadow(0 4px 12px rgba(240, 160, 0, 0.4));
}
.capa-titulo {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 38pt;
  font-weight: 300;
  letter-spacing: 0.02em;
  color: #f0a000;
  margin: 0 0 8mm 0;
  line-height: 1.1;
}
.capa-subtitulo {
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 16pt;
  font-weight: 300;
  color: #ccc;
  margin: 0 0 32mm 0;
  max-width: 160mm;
  line-height: 1.4;
}
.capa-divisor {
  width: 60mm;
  height: 2px;
  background: #f0a000;
  margin: 0 0 18mm 0;
}
.capa-meta {
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 11pt;
  color: #999;
  line-height: 1.8;
}
.capa-meta strong {
  color: #f0a000;
  font-weight: 600;
  display: block;
  font-size: 14pt;
  margin-bottom: 4mm;
}
.capa-rodape {
  position: absolute;
  bottom: 18mm;
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 9pt;
  color: #666;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* =================== PAGINAS DE CONTEUDO =================== */
.pagina {
  page-break-after: always;
  padding: 28mm 22mm 24mm 22mm;
  min-height: 297mm;
  position: relative;
}
.pagina:last-child { page-break-after: auto; }

/* Header de cada pagina */
.cabecalho {
  position: absolute;
  top: 12mm;
  left: 22mm;
  right: 22mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 8.5pt;
  color: #888;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 3mm;
  letter-spacing: 0.04em;
}
.cabecalho .doc-nome {
  color: #f0a000;
  font-weight: 600;
  text-transform: uppercase;
}
.cabecalho .doc-versao {
  color: #999;
}

/* Rodape de cada pagina */
.rodape {
  position: absolute;
  bottom: 12mm;
  left: 22mm;
  right: 22mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 8.5pt;
  color: #999;
  border-top: 1px solid #e0e0e0;
  padding-top: 3mm;
}
.rodape .pagina-num::after {
  content: counter(pagina);
}
.rodape .autor {
  color: #f0a000;
  font-weight: 600;
}

/* =================== TIPOGRAFIA =================== */
h1, h2, h3, h4, h5, h6 {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: #1a1a1a;
  page-break-after: avoid;
  margin: 0 0 0.4em 0;
}
h1 {
  font-size: 28pt;
  font-weight: 700;
  color: #f0a000;
  margin-top: 0;
  padding-bottom: 6mm;
  border-bottom: 3px solid #f0a000;
  page-break-before: always;
  page-break-after: avoid;
}
h1:first-of-type, .pagina:first-of-type h1 { page-break-before: avoid; }

h2 {
  font-size: 20pt;
  font-weight: 600;
  color: #1a1a1a;
  margin-top: 12mm;
  margin-bottom: 5mm;
  padding: 4mm 0 3mm 0;
  border-bottom: 1px solid #e0e0e0;
  page-break-after: avoid;
  counter-increment: secao;
}
h2::before {
  content: counter(secao) ". ";
  color: #f0a000;
  font-weight: 700;
  margin-right: 4px;
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  color: #f0a000;
  margin-top: 8mm;
  margin-bottom: 3mm;
  page-break-after: avoid;
}

h4 {
  font-size: 12pt;
  font-weight: 600;
  color: #555;
  margin-top: 6mm;
  margin-bottom: 2mm;
  page-break-after: avoid;
}

p {
  margin: 0 0 0.8em 0;
  text-align: justify;
  hyphens: auto;
  page-break-inside: avoid;
}

ul, ol {
  margin: 0 0 1em 0;
  padding-left: 22px;
}
li {
  margin: 0.3em 0;
  page-break-inside: avoid;
}

strong { color: #1a1a1a; font-weight: 700; }
em { font-style: italic; }

a { color: #f0a000; text-decoration: none; border-bottom: 1px dotted #f0a000; }

/* =================== CODIGO =================== */
code {
  font-family: "Consolas", "Courier New", monospace;
  font-size: 9.5pt;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
  color: #c7254e;
}
pre {
  background: #1e1e1e;
  color: #e0e0e0;
  padding: 10px 14px;
  border-radius: 4px;
  border-left: 4px solid #f0a000;
  font-size: 9pt;
  line-height: 1.5;
  margin: 1em 0;
  overflow-x: auto;
  page-break-inside: avoid;
}
pre code {
  background: transparent;
  color: #e0e0e0;
  padding: 0;
  font-size: 9pt;
}

/* =================== CAIXAS TIPOGRAFICAS =================== */
blockquote {
  border-left: 5px solid #f0a000;
  background: #fffbf0;
  padding: 8px 16px;
  margin: 1em 0;
  color: #555;
  font-style: italic;
  page-break-inside: avoid;
}

.passo {
  background: #f8f8f8;
  border-left: 6px solid #f0a000;
  padding: 12px 18px;
  margin: 1.2em 0;
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
  position: relative;
}
.passo-titulo {
  display: block;
  color: #f0a000;
  font-family: "Segoe UI", Arial, sans-serif;
  font-weight: 700;
  font-size: 12pt;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.passo-conteudo { font-size: 10.5pt; }
.passo strong { color: #1a1a1a; }

.destaque {
  background: #fff8e1;
  border: 1px solid #f0a000;
  border-left: 6px solid #f0a000;
  padding: 12px 18px;
  margin: 1.2em 0;
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
}
.destaque-titulo {
  color: #f0a000;
  font-family: "Segoe UI", Arial, sans-serif;
  font-weight: 700;
  font-size: 12pt;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.atencao {
  background: #fff3e0;
  border: 1px solid #e65100;
  border-left: 6px solid #e65100;
  padding: 12px 18px;
  margin: 1.2em 0;
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
}
.atencao-titulo {
  color: #e65100;
  font-family: "Segoe UI", Arial, sans-serif;
  font-weight: 700;
  font-size: 12pt;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.perigo {
  background: #ffebee;
  border: 1px solid #c62828;
  border-left: 6px solid #c62828;
  padding: 12px 18px;
  margin: 1.2em 0;
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
}
.perigo-titulo {
  color: #c62828;
  font-family: "Segoe UI", Arial, sans-serif;
  font-weight: 700;
  font-size: 12pt;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sucesso {
  background: #e8f5e9;
  border: 1px solid #2e7d32;
  border-left: 6px solid #2e7d32;
  padding: 12px 18px;
  margin: 1.2em 0;
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
}
.sucesso-titulo {
  color: #2e7d32;
  font-family: "Segoe UI", Arial, sans-serif;
  font-weight: 700;
  font-size: 12pt;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info {
  background: #e3f2fd;
  border: 1px solid #1565c0;
  border-left: 6px solid #1565c0;
  padding: 12px 18px;
  margin: 1.2em 0;
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
}
.info-titulo {
  color: #1565c0;
  font-family: "Segoe UI", Arial, sans-serif;
  font-weight: 700;
  font-size: 12pt;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* =================== TABELAS =================== */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.2em 0;
  font-size: 10pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #ddd;
  padding: 7px 10px;
  text-align: left;
  vertical-align: top;
}
th {
  background: #1a1a1a;
  color: #f0a000;
  font-family: "Segoe UI", Arial, sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 9pt;
  letter-spacing: 0.04em;
}
tr:nth-child(even) td { background: #fafafa; }

/* =================== IMAGENS =================== */
img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 1em auto;
  display: block;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  page-break-inside: avoid;
}

hr {
  border: none;
  border-top: 2px solid #f0a000;
  margin: 18px 0;
  width: 40px;
}

/* =================== SUMARIO =================== */
.sumario {
  page-break-after: always;
  padding: 28mm 22mm 24mm 22mm;
  min-height: 297mm;
  position: relative;
}
.sumario h1 {
  page-break-before: avoid;
  margin-bottom: 8mm;
}
.sumario-lista {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: "Segoe UI", Arial, sans-serif;
}
.sumario-lista li {
  margin: 0;
  padding: 0;
  border-bottom: 1px dotted #ddd;
}
.sumario-lista a {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4mm 0;
  color: #1a1a1a;
  text-decoration: none;
  border: none;
  font-size: 12pt;
}
.sumario-lista a:hover { color: #f0a000; }
.sumario-num {
  color: #f0a000;
  font-weight: 700;
  margin-right: 4mm;
  min-width: 8mm;
}
.sumario-titulo { flex: 1; }
.sumario-pag {
  color: #999;
  font-size: 10pt;
  font-weight: 400;
}

/* =================== UTIL =================== */
.page-break { page-break-after: always; }
.no-break { page-break-inside: avoid; }
.texto-centro { text-align: center; }
.texto-direita { text-align: right; }
.texto-pequeno { font-size: 9.5pt; }
.texto-cinza { color: #888; }

/* Counter pra paginacao */
body { counter-reset: secao; }
`;

function processarCaixas(html) {
  // Substitui sintaxe custom :::tipo titulo \n corpo ::: por divs estilizadas
  // :::passo|FAZER ISSO|\ntexto::: -> <div class="passo"><span class="passo-titulo">PASSO: FAZER ISSO</span><div class="passo-conteudo">texto</div></div>
  return html
    .replace(/<blockquote>[\s\S]*?<p>:::(\w+)\s*\|\s*([^\n]+?)\n([\s\S]*?):::\s*<\/p>[\s\S]*?<\/blockquote>/g, (m, tipo, titulo, corpo) => {
      const cls = tipo.toLowerCase();
      return `<div class="${cls}"><span class="${cls}-titulo">${titulo.trim()}</span><div class="${cls}-conteudo">${md.renderInline(corpo.trim())}</div></div>`;
    })
    // Versao alternativa: ::tipo:: no inicio de paragrafo
    .replace(/<p>:::(\w+)\s*\|\s*([^\n]+?)\n([\s\S]*?):::\s*<\/p>/g, (m, tipo, titulo, corpo) => {
      const cls = tipo.toLowerCase();
      return `<div class="${cls}"><span class="${cls}-titulo">${titulo.trim()}</span><div class="${cls}-conteudo">${md.renderInline(corpo.trim())}</div></div>`;
    });
}

function gerarCapa(titulo, subtitulo, versao, data) {
  // Logo MLOPES DEV em SVG inline (preto/amarelo)
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="220" height="66">
    <g>
      <circle cx="22" cy="30" r="16" fill="none" stroke="#f0a000" stroke-width="2.5"/>
      <path d="M 14 30 L 22 22 L 30 30 L 22 38 Z" fill="#f0a000"/>
      <rect x="8" y="14" width="28" height="2" fill="#f0a000"/>
    </g>
    <text x="48" y="32" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="300" fill="#ffffff" letter-spacing="0.5">mlopes dev</text>
    <text x="48" y="48" font-family="Segoe UI, Arial, sans-serif" font-size="9" fill="#f0a000" letter-spacing="2">DESIGN · BR</text>
  </svg>`;

  return `<div class="capa">
    <div class="capa-barra-lateral"></div>
    <div class="capa-logo">${logoSvg}</div>
    <h1 class="capa-titulo">${titulo}</h1>
    <div class="capa-divisor"></div>
    <p class="capa-subtitulo">${subtitulo}</p>
    <div class="capa-meta">
      <strong>Versão ${versao}</strong>
      ${data}<br>
      ML Lopes Design
    </div>
    <div class="capa-rodape">Documento técnico · ${data}</div>
  </div>`;
}

function gerarCabecalho(docNome, docVersao) {
  return `<div class="cabecalho">
    <span class="doc-nome">${docNome}</span>
    <span class="doc-versao">${docVersao}</span>
  </div>`;
}

function gerarRodape() {
  return `<div class="rodape">
    <span class="autor">ML Lopes Design</span>
    <span>— <span class="pagina-num"></span> —</span>
  </div>`;
}

function gerarSumario(tituloSumario) {
  return `<div class="sumario">
    ${gerarCabecalho('Gestor Inteligente de Demandas', 'v0.2.16')}
    <h1>${tituloSumario}</h1>
    <ul class="sumario-lista" id="sumario-lista"></ul>
    ${gerarRodape()}
  </div>
  <script>
    // Preenche o sumario via JS apos carregar
    document.addEventListener('DOMContentLoaded', function() {
      const lista = document.getElementById('sumario-lista');
      if (!lista) return;
      const h2s = document.querySelectorAll('main h2');
      h2s.forEach((h, i) => {
        const num = (i + 1).toString();
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.innerHTML = '<span class="sumario-num">' + num + '</span><span class="sumario-titulo">' + h.textContent.replace(/^\\d+\\.\\s*/, '') + '</span><span class="sumario-pag">—</span>';
        if (!h.id) h.id = 'secao-' + (i+1);
        a.href = '#' + h.id;
        li.appendChild(a);
        lista.appendChild(li);
      });
    });
  </script>`;
}

function renderHtml(mdText, meta) {
  const { titulo, subtitulo, versao, data, docNome, docVersao, sumarioTitulo } = meta;
  const body = processarCaixas(md.render(mdText));
  const capa = gerarCapa(titulo, subtitulo, versao, data);
  const sumario = gerarSumario(sumarioTitulo || 'Sumario');
  // Aplica page-break-before:always nos h1
  const bodyWrapped = body
    .replace(/<h1/g, '<h1 id="topo"')
    .replace(/<h2/g, '<h2 id="SEC_PREFIX_')
    .replace(/<h2 id="SEC_PREFIX_([^"]+)"/g, (m, t) => `<h2 id="secao-${t.replace(/[^a-z0-9]/gi, '')}"`);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>${CSS}</style>
</head>
<body>
  ${capa}
  ${sumario}
  <main class="pagina">
    ${gerarCabecalho(docNome, docVersao)}
    <h1>${titulo}</h1>
    ${bodyWrapped}
    ${gerarRodape()}
  </main>
</body>
</html>`;
}

async function convert(mdFile, pdfFile, meta) {
  const mdText = fs.readFileSync(mdFile, 'utf-8');
  const html = renderHtml(mdText, meta);
  const htmlDebug = mdFile.replace(/\.md$/, '.html');
  fs.writeFileSync(htmlDebug, html, 'utf-8');
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => { /* nada */ });
    await new Promise(r => setTimeout(r, 500));
    await page.pdf({
      path: pdfFile,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8pt; color:#888; font-family:Segoe UI,Arial; width:100%; padding:0 22mm; display:flex; justify-content:space-between;"><span style="color:#f0a000; font-weight:600; text-transform:uppercase;">${meta.docNome}</span><span>${meta.docVersao}</span></div>`,
      footerTemplate: `<div style="font-size:8pt; color:#999; font-family:Segoe UI,Arial; width:100%; padding:0 22mm; display:flex; justify-content:space-between;"><span style="color:#f0a000; font-weight:600;">ML Lopes Design</span><span>Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
      margin: { top: '20mm', right: '0mm', bottom: '20mm', left: '0mm' },
    });
    console.log('OK:', path.relative(ROOT, pdfFile));
  } finally {
    await browser.close();
  }
}

async function main() {
  const versao = '0.2.16';
  const data = '17 de agosto de 2026';
  const jobs = [
    {
      md: 'MANUAL-INSTALACAO.md', pdf: 'MANUAL-INSTALACAO.pdf',
      meta: {
        titulo: 'Manual de Instalacao',
        subtitulo: 'Guia completo para baixar, instalar e configurar o Gestor Inteligente de Demandas no Windows 10 e 11',
        versao, data,
        docNome: 'Manual de Instalacao',
        docVersao: `v${versao} · ${data}`,
        sumarioTitulo: 'Sumario',
      },
    },
    {
      md: 'GUIA-PRATICO.md', pdf: 'GUIA-PRATICO.pdf',
      meta: {
        titulo: 'Guia Pratico de Uso',
        subtitulo: 'Como usar todas as funcionalidades do Gestor Inteligente de Demandas no dia a dia',
        versao, data,
        docNome: 'Guia Pratico',
        docVersao: `v${versao} · ${data}`,
        sumarioTitulo: 'Sumario',
      },
    },
  ];
  for (const j of jobs) {
    const mdPath = path.join(DOCS, j.md);
    const pdfPath = path.join(DOCS, j.pdf);
    if (!fs.existsSync(mdPath)) {
      console.log('SKIP (nao existe):', j.md);
      continue;
    }
    await convert(mdPath, pdfPath, j.meta);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
