// tools/_md-to-pdf.js — converte MANUAL-*.md / GUIA-*.md em PDF
// Usa markdown-it (Markdown -> HTML) + puppeteer-core + Edge (HTML -> PDF)
// Tudo GRÁTIS. Sem certificados, sem custos externos.

const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

function renderHtml(mdText, title) {
  const body = md.render(mdText);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; }
    h1 { color: #f0a000; font-size: 26pt; border-bottom: 3px solid #f0a000; padding-bottom: 8px; margin-top: 0; }
    h2 { color: #f0a000; font-size: 18pt; margin-top: 28pt; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    h3 { color: #1a1a1a; font-size: 14pt; margin-top: 20pt; }
    h4 { color: #1a1a1a; font-size: 12pt; margin-top: 14pt; }
    p { margin: 10pt 0; }
    code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-family: Consolas, "Courier New", monospace; font-size: 10pt; }
    pre { background: #1e1e1e; color: #e0e0e0; padding: 12px 14px; border-radius: 4px; overflow-x: auto; font-size: 9.5pt; line-height: 1.4; }
    pre code { background: transparent; color: inherit; padding: 0; font-size: 9.5pt; }
    blockquote { border-left: 4px solid #f0a000; padding: 6px 14px; color: #555; background: #fffbf0; margin: 12pt 0; }
    table { border-collapse: collapse; width: 100%; margin: 14pt 0; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f0a000; color: #000; }
    tr:nth-child(even) td { background: #fafafa; }
    a { color: #f0a000; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #ccc; margin: 20pt 0; }
    ul, ol { margin: 8pt 0; padding-left: 24pt; }
    li { margin: 4pt 0; }
    img { max-width: 100%; }
    .footer { color: #999; font-size: 9pt; text-align: center; margin-top: 30pt; padding-top: 8pt; border-top: 1px solid #ddd; }
    .toc { background: #f9f9f9; padding: 10pt 14pt; border-radius: 4px; margin-bottom: 18pt; }
    .toc h2 { margin-top: 0; font-size: 14pt; border: none; padding: 0; }
    .toc ul { list-style: none; padding-left: 0; }
    .toc li { margin: 3pt 0; }
    .destaque { background: #fff3cd; border: 1px solid #f0a000; padding: 10pt 14pt; border-radius: 4px; margin: 12pt 0; }
    .passo { background: #f5f5f5; border-left: 4px solid #f0a000; padding: 12pt 16pt; margin: 14pt 0; border-radius: 0 4px 4px 0; }
    .passo strong { color: #f0a000; }
  </style>
</head>
<body>
${body}
<div class="footer">ML Lopes Design · Gestor Inteligente de Demandas</div>
</body>
</html>`;
}

async function convert(mdFile, pdfFile, title) {
  const mdText = fs.readFileSync(mdFile, 'utf-8');
  const html = renderHtml(mdText, title);
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfFile,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
    });
    console.log('OK:', path.relative(ROOT, pdfFile));
  } finally {
    await browser.close();
  }
}

async function main() {
  const jobs = [
    ['MANUAL-INSTALACAO.md', 'MANUAL-INSTALACAO.pdf', 'Manual de Instalacao - Gestor Inteligente de Demandas'],
    ['GUIA-PRATICO.md', 'GUIA-PRATICO.pdf', 'Guia Pratico de Uso - Gestor Inteligente de Demandas'],
  ];
  for (const [mdName, pdfName, title] of jobs) {
    const mdPath = path.join(DOCS, mdName);
    const pdfPath = path.join(DOCS, pdfName);
    if (!fs.existsSync(mdPath)) {
      console.log('SKIP (nao existe):', mdName);
      continue;
    }
    await convert(mdPath, pdfPath, title);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
