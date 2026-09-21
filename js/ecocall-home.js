/* Landing page pública: nav sticky, busca, chips de cidade, filtros, menu mobile e CTAs. */
(function () {
  window.addEventListener('scroll', function () {
    var nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);

    var backBtn = document.getElementById('btn-back-to-top');
    if (backBtn) {
      backBtn.classList.toggle('visible', window.scrollY > 300);
    }
  });

  function toggleMobileHomeNav(force) {
    var drawer = document.getElementById('home-nav-drawer');
    var overlay = document.getElementById('home-nav-overlay');
    if (!drawer) return;

    var shouldOpen = typeof force === 'boolean' ? force : !drawer.classList.contains('is-active');
    if (shouldOpen) {
      drawer.classList.add('is-active');
      if (overlay) overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('is-active');
      if (overlay) overlay.classList.remove('is-active');
      document.body.style.overflow = '';
    }
  }

  function scrollerPara(className) {
    toggleMobileHomeNav(false);
    var el = document.querySelector('.' + className);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function normalizarTexto(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function sincronizarBusca(termo) {
    var navInput = document.getElementById('nav-search-input');
    var heroInput = document.getElementById('hs');
    var navClear = document.getElementById('nav-search-clear');

    if (navInput && navInput.value !== termo) navInput.value = termo;
    if (heroInput && heroInput.value !== termo) heroInput.value = termo;
    if (navClear) navClear.style.display = termo ? 'flex' : 'none';
  }

  function executarBuscaHome(termo, shouldScroll) {
    sincronizarBusca(termo);

    var termoNorm = normalizarTexto(termo);
    var cards = document.querySelectorAll('.ecard');
    var banner = document.getElementById('search-results-banner');
    var bannerText = document.getElementById('srb-text');
    var chips = document.querySelectorAll('.hero-chips .chip');

    chips.forEach(function (c) {
      var chipText = normalizarTexto(c.textContent);
      c.classList.toggle('active', termoNorm && chipText.includes(termoNorm));
    });

    if (!termoNorm) {
      cards.forEach(function (card) {
        card.style.display = 'flex';
      });
      if (banner) banner.style.display = 'none';
      return;
    }

    var count = 0;
    cards.forEach(function (card) {
      var textoCard = normalizarTexto(card.textContent + ' ' + (card.getAttribute('data-tags') || ''));
      if (textoCard.indexOf(termoNorm) !== -1) {
        card.style.display = 'flex';
        card.style.animation = 'fadeIn 0.3s ease forwards';
        count++;
      } else {
        card.style.display = 'none';
      }
    });

    if (banner && bannerText) {
      banner.style.display = 'flex';
      if (count > 0) {
        bannerText.innerHTML = '🌿 <strong>' + count + ' ' + (count === 1 ? 'coletor/empresa encontrado' : 'coletores/empresas encontrados') + '</strong> para "<em>' + window.escapeHtml(termo) + '</em>" em Santos';
      } else {
        bannerText.innerHTML = '⚠ Nenhum ponto de coleta localizado para "<em>' + window.escapeHtml(termo) + '</em>" em Santos.';
      }
    }

    if (shouldScroll) {
      scrollerPara('sec-emp');
      if (count > 0) {
        window.toast('🔍 ' + count + ' ' + (count === 1 ? 'coletor encontrado' : 'coletores encontrados') + ' no bairro ' + termo + '!', 'success');
      } else {
        window.toast('⚠ Nenhum coletor localizado para "' + termo + '". Tente Gonzaga, Paquetá ou Alemoa.', 'warning', 3500);
      }
    }
  }

  function limparBuscaHome() {
    sincronizarBusca('');
    var banner = document.getElementById('search-results-banner');
    if (banner) banner.style.display = 'none';

    document.querySelectorAll('.hero-chips .chip').forEach(function (c) {
      c.classList.remove('active');
    });

    var cards = document.querySelectorAll('.ecard');
    cards.forEach(function (card) {
      card.style.display = 'flex';
    });

    var btnTodos = document.querySelector('.fbtn');
    if (btnTodos) btnTodos.click();

    window.toast('✨ Exibindo todas as empresas e cooperativas de Santos', 'info');
  }

  function buscar() {
    var input = document.getElementById('hs') || document.getElementById('nav-search-input');
    var value = input ? input.value.trim() : '';
    if (!value) {
      window.toast('⚠ Digite um bairro ou material para pesquisar em Santos', 'warning');
      return;
    }
    executarBuscaHome(value, true);
  }

  function sc(bairro) {
    sincronizarBusca(bairro);
    executarBuscaHome(bairro, true);
  }

  function filt(btn, tag) {
    document.querySelectorAll('.fbtn').forEach(function (b) {
      b.classList.remove('on');
    });
    btn.classList.add('on');

    var category = tag || (btn.textContent || '').toLowerCase().replace(/[^a-z]/g, '');
    var cards = document.querySelectorAll('.ecard');
    var count = 0;

    cards.forEach(function (card) {
      var tags = (card.getAttribute('data-tags') || '').toLowerCase();
      if (!category || category === 'todos' || tags.indexOf(category) !== -1) {
        card.style.display = 'flex';
        card.style.animation = 'fadeIn 0.35s ease forwards';
        count++;
      } else {
        card.style.display = 'none';
      }
    });

    var banner = document.getElementById('search-results-banner');
    if (banner) banner.style.display = 'none';

    window.toast('🌿 ' + count + ' ' + (count === 1 ? 'coletor encontrado' : 'coletores encontrados') + ' para ' + btn.textContent.trim(), 'success');
  }

  function irParaMapa() {
    toggleMobileHomeNav(false);
    try {
      var stored = sessionStorage.getItem('ecocall_user');
      if (stored) {
        var user = JSON.parse(stored);
        if (user.tipo === 'empresa') {
          window.showLoader('dashboard_empresa.html', { text: 'Abrindo painel...' });
        } else {
          window.showLoader('ecocall-dashbord_usuario.html', { text: 'Abrindo mapa...' });
        }
        return;
      }
    } catch (e) {}

    window.toast('🗺️ Acesse sua conta para explorar o mapa interativo completo de Santos.', 'info', 2500);
    setTimeout(function () {
      window.showLoader('ecocall-login.html', { text: 'Redirecionando...' });
    }, 900);
  }

  function irParaLogin()    { toggleMobileHomeNav(false); window.showLoader('ecocall-login.html'); }
  function irParaCadastro() { toggleMobileHomeNav(false); window.showLoader('ecocall_cadastro.html'); }

  /* Controles de FAQ Interativo */
  function toggleFaq(item) {
    if (!item) return;
    var isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(function (el) {
      el.classList.remove('active');
    });
    if (!isActive) {
      item.classList.add('active');
    }
  }

  /* Filtros rápidos do Menu Empresas */
  function filtrarMelhoresAvaliadas() {
    toggleMobileHomeNav(false);
    scrollerPara('sec-emp');
    var btnTodos = document.querySelector('.fbtn');
    if (btnTodos) btnTodos.click();
    window.toast('⭐ Exibindo cooperativas e pontos com nota 4.8 a 5.0 em Santos!', 'success');
  }

  function filtrarRecemCadastradas() {
    toggleMobileHomeNav(false);
    scrollerPara('sec-emp');
    var btnEletronicos = document.querySelector('.fbtn[data-tag="reee"]') || document.querySelectorAll('.fbtn')[4];
    if (btnEletronicos) btnEletronicos.click();
    window.toast('🆕 Exibindo novos pontos credenciados em Santos!', 'info');
  }

  /* Modais Interativos da Home (Sobre & Contato) */
  function abrirModalSobre() {
    toggleMobileHomeNav(false);
    var modal = document.getElementById('modal-sobre-overlay');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function fecharModalSobre(event) {
    if (event && event.target && event.target !== document.getElementById('modal-sobre-overlay')) return;
    var modal = document.getElementById('modal-sobre-overlay');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function abrirModalContato() {
    toggleMobileHomeNav(false);
    var modal = document.getElementById('modal-contato-overlay');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function fecharModalContato(event) {
    if (event && event.target && event.target !== document.getElementById('modal-contato-overlay')) return;
    var modal = document.getElementById('modal-contato-overlay');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function enviarContatoHome(event) {
    if (event && event.preventDefault) event.preventDefault();
    var nome = (document.getElementById('fc-nome') || {}).value || '';
    var email = (document.getElementById('fc-email') || {}).value || '';
    var msg = (document.getElementById('fc-msg') || {}).value || '';

    if (!nome || !email || !msg) {
      window.toast('⚠ Preencha todos os campos da mensagem.', 'warning');
      return;
    }

    var btnSubmit = event.target ? event.target.querySelector('button[type="submit"]') : null;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Enviando...';
    }

    setTimeout(function () {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Mensagem 🚀';
      }
      var form = document.getElementById('form-contato-home');
      if (form) form.reset();
      fecharModalContato();
      window.toast('✓ Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.', 'success', 4000);
    }, 800);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var hs = document.getElementById('hs');
    if (hs) hs.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') buscar();
    });
  });

  window.buscar = buscar;
  window.sc = sc;
  window.filt = filt;
  window.executarBuscaHome = executarBuscaHome;
  window.sincronizarBusca = sincronizarBusca;
  window.limparBuscaHome = limparBuscaHome;
  window.irParaMapa = irParaMapa;
  window.irParaLogin = irParaLogin;
  window.irParaCadastro = irParaCadastro;
  window.toggleMobileHomeNav = toggleMobileHomeNav;
  window.scrollerPara = scrollerPara;
  window.toggleFaq = toggleFaq;
  window.abrirModalSobre = abrirModalSobre;
  window.fecharModalSobre = fecharModalSobre;
  window.abrirModalContato = abrirModalContato;
  window.fecharModalContato = fecharModalContato;
  window.enviarContatoHome = enviarContatoHome;
  window.filtrarMelhoresAvaliadas = filtrarMelhoresAvaliadas;
  window.filtrarRecemCadastradas = filtrarRecemCadastradas;
})();

