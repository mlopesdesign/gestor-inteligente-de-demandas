// src/js/telas/_chrome.js — componentes compartilhados das telas
// Topbar com logo + versao, sidebar com itens do menu.

export function topbar() {
  return `
    <div class="topbar">
      <img src="/resources/images/logo-icon.png" alt="mlopes dev" class="brand-logo">
      <span class="brand">Gestor</span>
      <span class="brand-sub" id="versao-app"></span>
      <span class="spacer"></span>
      <span class="status" id="status-topo"></span>
    </div>`;
}

export function menuLateral(ativa) {
  const itens = [
    ['hoje',     'Hoje',             '📅'],
    ['inbox',    'Caixa de entrada', '📥'],
    ['tarefas',  'Tarefas',          '✅'],
    ['projetos', 'Projetos',         '📁'],
    ['clientes', 'Clientes',         '👥'],
    ['areas',    'Áreas',            '🎨'],
    ['busca',    'Buscar',           '🔍'],
    ['config',   'Configuracoes',    '⚙️'],
  ];
  return '<ul class="nav">' + itens.map(([r, t, ic]) =>
    `<li><a href="#" data-rota="${r}"${r===ativa?' class="ativa"':''}><span class="ic">${ic}</span> ${t}</a></li>`
  ).join('') + '</ul>';
}
