// app.js — smoke test do servidor. Sem build, sem framework.
(function () {
  'use strict';

  var saida = document.getElementById('saida');

  function render(obj, classe) {
    saida.className = classe || '';
    saida.textContent = JSON.stringify(obj, null, 2);
  }

  fetch('/api/v1/ping', { headers: { 'X-API-Version': '1' } })
    .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
    .then(function (out) {
      if (out.status >= 200 && out.status < 300 && out.body && out.body.ok) {
        render(out.body, 'ok');
      } else {
        render(out, 'err');
      }
    })
    .catch(function (e) {
      render({ ok: false, erro: { mensagem: String(e) } }, 'err');
    });
})();
