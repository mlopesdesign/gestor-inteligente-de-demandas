// src/js/telas/configuracoes.js — perfil, export, apagar conta (LGPD)
import { escapeHtml, modal, toast } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

export async function renderConfig() {
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    ${topbar()}
    <div class="main">
      <aside class="sidebar">${menuLateral('config')}</aside>
      <main class="conteudo">
        <h2 style="color: var(--cor-marca);">Configurações</h2>
        <div id="config-content">carregando...</div>
      </main>
    </div>
  `;
  document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0');
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });
  carregar();
}

async function carregar() {
  const r = await window.api('config:obter');
  if (!r.ok) { document.getElementById('config-content').innerHTML = '<p class="vazia">Erro: ' + escapeHtml(r.erro?.mensagem || '') + '</p>'; return; }
  const { usuario, cobranca, stats } = r.dados;
  document.getElementById('config-content').innerHTML = `
    <div class="card">
      <h3>👤 Perfil</h3>
      <form id="form-perfil">
        <div class="campo"><label>Nome</label><input name="nome" value="${escapeHtml(usuario.nome || '')}"></div>
        <div class="campo"><label>Email (somente leitura)</label><input value="${escapeHtml(usuario.email || '')}" disabled></div>
        <div style="display:flex; gap:8px;">
          <div class="campo" style="flex:1;"><label>Fuso</label>
            <select name="fuso">
              ${['America/Sao_Paulo','America/New_York','Europe/Lisbon','Europe/London','UTC'].map(f => `<option value="${f}" ${usuario.fuso===f?'selected':''}>${f}</option>`).join('')}
            </select>
          </div>
          <div class="campo" style="flex:1;"><label>Tom de cobrança</label>
            <select name="tom_cobranca">
              ${['PROFISSIONAL','FIRME','GENTIL'].map(f => `<option value="${f}" ${usuario.tom_cobranca===f?'selected':''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <div class="campo" style="flex:1;"><label>Horário início</label><input type="time" name="horario_trab_inicio" value="${usuario.horario_trab_inicio || '08:00'}"></div>
          <div class="campo" style="flex:1;"><label>Horário fim</label><input type="time" name="horario_trab_fim" value="${usuario.horario_trab_fim || '18:00'}"></div>
        </div>
        <div class="campo"><label>Silenciar cobrança fora do horário</label>
          <label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" name="silenciar_fora_horario" ${cobranca.silenciar_fora_horario ? 'checked' : ''}> Sim</label>
        </div>
        <div class="acoes"><button type="submit" class="primary">Salvar perfil</button></div>
      </form>
    </div>

    ${stats ? `<div class="card">
      <h3>📊 Estatísticas</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
        <div><div style="color:var(--fg-3); font-size:11px;">Tarefas</div><div style="font-size:24px; font-weight:bold;">${stats.total_tarefas || 0}</div><div style="font-size:11px; color:var(--success);">${stats.concluidas || 0} concluídas</div></div>
        <div><div style="color:var(--fg-3); font-size:11px;">Projetos</div><div style="font-size:24px; font-weight:bold;">${stats.total_projetos || 0}</div></div>
        <div><div style="color:var(--fg-3); font-size:11px;">Clientes</div><div style="font-size:24px; font-weight:bold;">${stats.total_clientes || 0}</div></div>
        <div><div style="color:var(--fg-3); font-size:11px;">Áreas</div><div style="font-size:24px; font-weight:bold;">${stats.total_areas || 0}</div></div>
      </div>
    </div>` : ''}

    <div class="card">
      <h3>💾 Exportar dados (LGPD)</h3>
      <p style="color:var(--fg-3); font-size:12px;">Baixa um JSON com TODOS os seus dados (tarefas, projetos, clientes, áreas, lembretes, auditoria).</p>
      <button id="btn-exportar" class="primary">Exportar tudo</button>
    </div>

    <div class="card" style="border-left: 4px solid var(--danger);">
      <h3 style="color:var(--danger);">⚠ Apagar conta (LGPD)</h3>
      <p style="color:var(--fg-3); font-size:12px;">Esta ação é IRREVERSÍVEL. Todos os seus dados serão apagados permanentemente.</p>
      <button id="btn-apagar" class="danger">Apagar minha conta</button>
    </div>

    <div class="card">
      <h3>🚪 Sessão</h3>
      <button id="btn-logout">Sair (logout)</button>
    </div>
  `;

  document.getElementById('form-perfil').onsubmit = async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    dados.silenciar_fora_horario = !!e.target.querySelector('[name=silenciar_fora_horario]').checked;
    delete dados.email;
    const r2 = await window.api('config:atualizar', dados);
    if (r2.ok) { toast({ tipo: 'sucesso', titulo: 'Salvo', corpo: 'Perfil atualizado' }); carregar(); }
    else { alert(r2.erro?.mensagem || 'erro'); }
  };

  document.getElementById('btn-exportar').onclick = async () => {
    const r2 = await window.api('config:exportar');
    if (!r2.ok) { alert(r2.erro?.mensagem || 'erro'); return; }
    const json = JSON.stringify(r2.dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gestor-export-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({ tipo: 'sucesso', titulo: 'Exportado', corpo: 'Download iniciado' });
  };

  document.getElementById('btn-apagar').onclick = async () => {
    if (!confirm('TEM CERTEZA? Esta ação é IRREVERSÍVEL e apaga TODOS os seus dados.')) return;
    if (!confirm('Última chance: digite OK mentalmente e clique em OK para confirmar.')) return;
    const r2 = await window.api('config:apagar', { motivo: 'usuario solicitou pela UI' });
    if (r2.ok) {
      try { localStorage.removeItem('gestor-lembrar-sessao'); } catch (_) {}
      alert('Conta apagada. O app será fechado.');
      // Tenta fechar o app
      try { window.Neutralino?.app?.exit?.(); } catch (_) {}
      setTimeout(() => { try { window.close(); } catch (_) {} }, 500);
    } else { alert(r2.erro?.mensagem || 'erro'); }
  };

  document.getElementById('btn-logout').onclick = async () => {
    await window.api('auth:logout');
    try { localStorage.removeItem('gestor-lembrar-sessao'); } catch (_) {}
    location.reload();
  };
}
