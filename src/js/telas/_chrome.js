// src/js/telas/_chrome.js — componentes compartilhados das telas
// Topbar com logo + versão, sidebar com itens do menu.
// v0.2.8: sem emojis. Marcio odeia. Icones via label/texto mesmo.

export function topbar() {
 return `
 <div class="topbar">
 <img src="/src/resources/images/logo.png" alt="Gestor" class="brand-logo">
 <span class="brand">Gestor</span>
 <span class="brand-sub" id="versão-app"></span>
 <span class="spacer"></span>
 <span class="status" id="status-topo"></span>
 </div>`;
}

export function menuLateral(ativa) {
 // Label curto, sem emoji. O active state e' por CSS.
 const itens = [
 ['hoje', 'Hoje'],
 ['inbox', 'Caixa de entrada'],
 ['tarefas', 'Tarefas'],
 ['projetos', 'Projetos'],
 ['clientes', 'Clientes'],
 ['areas', 'Areas'],
 ['busca', 'Buscar'],
 ['config', 'Configuracoes'],
 ];
 return '<ul class="nav">' + itens.map(([r, t]) =>
 `<li><a href="#" data-rota="${r}"${r===ativa?' class="ativa"':''}>${t}</a></li>`
 ).join('') + '</ul>';
}
