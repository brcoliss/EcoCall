/* ==========================================================================
   EcoCall — Núcleo JS compartilhado por todas as páginas
   - toast()         exibe mensagem temporária (#tst / #tmsg)
   - transicaoPara() navega ativando o loading-screen
   - logout()        encerra sessão para a home pública
   - showLoader()    helper genérico de loader + redirect
   - Auto-ativa o item de nav correspondente à URL atual
   ========================================================================== */
(function () {
  'use strict';

  function getLoader() {
    return document.getElementById('loading-screen');
  }

  function setLoaderText(text) {
    var loader = getLoader();
    if (!loader) return;
    var p = loader.querySelector('p');
    if (p && text) p.textContent = text;
  }

  function showLoader(dest, opts) {
    opts = opts || {};
    var loader = getLoader();
    if (loader) loader.classList.add('is-active');
    if (opts.text) setLoaderText(opts.text);
    var delay = typeof opts.delay === 'number' ? opts.delay : 800;
    if (dest) setTimeout(function () { window.location.href = dest; }, delay);
  }

  function transicaoPara(url, e) {
    if (e && e.preventDefault) e.preventDefault();
    showLoader(url, { delay: 700 });
  }

  function logout(e) {
    if (e && e.preventDefault) e.preventDefault();
    showLoader('ecocall-home.html', {
      delay: 900,
      text: 'Encerrando sessão…'
    });
  }

  function toast(message, duration) {
    duration = duration || 3000;
    var t = document.getElementById('tst') || document.getElementById('toast');
    if (!t) return;
    var msgEl = document.getElementById('tmsg') || document.getElementById('toastMsg');
    if (msgEl) msgEl.textContent = message;
    // Suporta ambas as convenções de classe ativa usadas no projeto.
    t.classList.add('on');
    t.classList.add('show');
    setTimeout(function () {
      t.classList.remove('on');
      t.classList.remove('show');
    }, duration);
  }

  // Ativa o link de navegação correspondente à página atual.
  function highlightActiveNav() {
    var current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var links = document.querySelectorAll('.sidebar-menu .nav-item, .nav-menu .nav-link');
    links.forEach(function (link) {
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (href && href === current) link.classList.add('active');
    });
  }

  // Expõe globalmente (templates usam onclick="...").
  window.toast = toast;
  window.transicaoPara = transicaoPara;
  window.logout = logout;
  window.showLoader = showLoader;

  document.addEventListener('DOMContentLoaded', highlightActiveNav);
})();
