/* ==========================================================================
   EcoCall — Núcleo JS compartilhado por todas as páginas
   - toast()               exibe mensagem temporária (#tst / #tmsg)
   - transicaoPara()       navega ativando o loading-screen
   - logout()              encerra sessão para a home pública
   - showLoader()          helper genérico de loader + redirect
   - syncUserProfile()     carrega e sincroniza dados do usuário logado na sidebar e topbar
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

  function apiFetch(endpoint, options) {
    options = options || {};
    options.headers = options.headers || {};
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    return fetch(endpoint, options)
      .then(function (res) {
        return res.text().then(function (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error('API Non-JSON Response from ' + endpoint + ':', text);
            return { error: 'Resposta inesperada do servidor: ' + (text ? text.substring(0, 120) : 'vazia') };
          }
        });
      })
      .catch(function (err) {
        console.error('API Error:', err);
        return { error: 'Falha de conexão com o servidor. Verifique se o Apache/PHP está ativo no XAMPP.' };
      });
  }

  function logout(e) {
    if (e && e.preventDefault) e.preventDefault();
    try { sessionStorage.removeItem('ecocall_user'); } catch (err) {}
    apiFetch('api/auth/logout.php', { method: 'POST' }).then(function (res) {
      showLoader('ecocall-home.html', {
        delay: 600,
        text: 'Encerrando sessão…'
      });
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toggleMobileSidebar(force) {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebar-overlay') || document.querySelector('.sidebar-overlay');
    if (!sidebar) return;

    var shouldOpen = typeof force === 'boolean' ? force : !sidebar.classList.contains('is-open');
    if (shouldOpen) {
      sidebar.classList.add('is-open', 'open');
      if (overlay) overlay.classList.add('active', 'open');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('is-open', 'open');
      if (overlay) overlay.classList.remove('active', 'open');
      document.body.style.overflow = '';
    }
  }

  function toast(message, typeOrDuration, maybeDuration) {
    var type = 'info';
    var duration = 3200;

    if (typeof typeOrDuration === 'number') {
      duration = typeOrDuration;
    } else if (typeof typeOrDuration === 'string') {
      type = typeOrDuration;
      if (typeof maybeDuration === 'number') duration = maybeDuration;
    }

    if (typeof typeOrDuration !== 'string') {
      var lower = (message || '').toLowerCase();
      if (lower.includes('✓') || lower.includes('sucesso') || lower.includes('parabéns') || lower.includes('concluíd') || lower.includes('salvo')) {
        type = 'success';
      } else if (lower.includes('⚠') || lower.includes('erro') || lower.includes('falha') || lower.includes('inválid') || lower.includes('expirou')) {
        type = 'error';
      } else if (lower.includes('atenção') || lower.includes('aviso') || lower.includes('pendente')) {
        type = 'warning';
      }
    }

    var t = document.getElementById('tst') || document.getElementById('toast');
    if (!t) return;
    var msgEl = document.getElementById('tmsg') || document.getElementById('toastMsg');
    if (msgEl) msgEl.textContent = message;

    t.classList.remove('toast-success', 'toast-error', 'toast-warning', 'toast-info');
    t.classList.add('toast-' + type);
    t.classList.add('on', 'show');

    if (t._toastTimer) clearTimeout(t._toastTimer);
    t._toastTimer = setTimeout(function () {
      t.classList.remove('on', 'show');
    }, duration);
  }

  function applyUserDataToDOM(u) {
    if (!u) return;
    var nome = u.nome || u.razao_social || 'Usuário';
    var email = u.email || '';
    var parts = nome.split(' ').filter(Boolean);
    var initials = parts.map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase() || 'EC';
    var cidade = (u.cidade || 'Santos') + (u.uf ? (', ' + u.uf) : '');
    var avatarUrl = u.avatar_url || (u.empresa && u.empresa.avatar_url) || null;

    var avatarEls = document.querySelectorAll('#dash-sidebar-avatar, #pf-sidebar-avatar, .sidebar-footer .avatar-mini');
    var nameEls   = document.querySelectorAll('#dash-sidebar-name, #pf-sidebar-name, .sidebar-footer .user-name');
    var emailEls  = document.querySelectorAll('#dash-sidebar-email, #pf-sidebar-email, .sidebar-footer .user-email');
    var cityEls   = document.querySelectorAll('#dash-topbar-city, #emp-topbar-city, #pf-topbar-city, .user-location-badge .status-label, .user-location-badge .label');

    avatarEls.forEach(function (el) {
      if (avatarUrl) {
        el.innerHTML = '<img src="' + avatarUrl + '?v=' + Date.now() + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">';
      } else {
        el.textContent = initials;
      }
    });

    // Atualiza o avatar dos cards de perfil
    var profileCardAvatars = document.querySelectorAll('#usr-card-avatar, #emp-card-avatar, .profile-side-card .profile-pic');
    profileCardAvatars.forEach(function (el) {
      if (avatarUrl) {
        el.innerHTML = '<img src="' + avatarUrl + '?v=' + Date.now() + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">';
      } else {
        el.textContent = initials;
      }
    });

    nameEls.forEach(function (el) { el.textContent = nome; });
    emailEls.forEach(function (el) { el.textContent = email; });
    cityEls.forEach(function (el) {
      if (!el.classList.contains('dot-indicator') && !el.classList.contains('dot')) {
        el.textContent = cidade;
      }
    });

    var greetingEl = document.getElementById('dash-greeting');
    if (greetingEl) {
      var primeiroNome = parts[0] || nome;
      var hr = new Date().getHours();
      var saudacao = hr < 12 ? 'Bom dia' : (hr < 18 ? 'Boa tarde' : 'Boa noite');
      greetingEl.textContent = saudacao + ', ' + primeiroNome + ' 👋';
    }
  }

  function syncUserProfile(cachedUser) {
    var page = (location.pathname.split('/').pop() || '').toLowerCase();

    if (cachedUser) {
      applyUserDataToDOM(cachedUser);
      try { sessionStorage.setItem('ecocall_user', JSON.stringify(cachedUser)); } catch (e) {}
      return Promise.resolve(cachedUser);
    }

    try {
      var stored = sessionStorage.getItem('ecocall_user');
      if (stored) {
        var parsed = JSON.parse(stored);
        applyUserDataToDOM(parsed);
        if (parsed.tipo === 'empresa' && page === 'ecocall-dashbord_usuario.html') {
          window.location.replace('dashboard_empresa.html');
          return Promise.resolve(parsed);
        }
      }
    } catch (e) {}

    var isAuthProtected = [
      'ecocall-dashbord_usuario.html',
      'minhas-coletas.html',
      'dashboard_empresa.html'
    ].indexOf(page) !== -1;

    if (!isAuthProtected && !document.querySelector('.sidebar-footer')) {
      return Promise.resolve(null);
    }

    return apiFetch('api/auth/me.php').then(function (res) {
      if (res && res.authenticated) {
        var userType = (res.user && res.user.tipo) || (res.empresa ? 'empresa' : 'user');
        var userData = (userType === 'empresa' && res.empresa) ? res.empresa : res.user;
        if (!userData.tipo) userData.tipo = userType;
        if (!userData.nome && res.user && res.user.nome) userData.nome = res.user.nome;
        try { sessionStorage.setItem('ecocall_user', JSON.stringify(userData)); } catch (e) {}
        applyUserDataToDOM(userData);

        // Guarda de rotas: se for empresa na tela de usuário, direciona para o painel da empresa
        if (userType === 'empresa' && page === 'ecocall-dashbord_usuario.html') {
          window.location.replace('dashboard_empresa.html');
          return userData;
        }

        // Guarda de rotas: se for usuário comum em tela restrita de empresa, direciona para painel do usuário
        if (userType === 'user' && page === 'dashboard_empresa.html') {
          window.location.replace('ecocall-dashbord_usuario.html');
          return userData;
        }

        return userData;
      } else if (isAuthProtected) {
        try { sessionStorage.removeItem('ecocall_user'); } catch (e) {}
        toast('Sessão expirada. Redirecionando...');
        setTimeout(function () { window.location.href = 'ecocall-login.html'; }, 1000);
      }
      return null;
    });
  }

  function abrirComprovanteDigital(protocoloOrId) {
    if (!protocoloOrId) {
      toast('⚠ Protocolo da coleta não identificado.', 'warning');
      return;
    }
    
    toast('📄 Carregando Comprovante Oficial...', 'info', 1200);

    var paramKey = (typeof protocoloOrId === 'number' || /^\d+$/.test(protocoloOrId)) ? 'id' : 'protocolo';
    apiFetch('api/coletas/comprovante.php?' + paramKey + '=' + encodeURIComponent(protocoloOrId))
      .then(function (res) {
        if (!res || !res.success || !res.comprovante) {
          toast('⚠ ' + (res && res.error ? res.error : 'Não foi possível carregar os dados da coleta.'), 'warning');
          return;
        }
        renderizarModalComprovante(res.comprovante);
      })
      .catch(function () {
        toast('⚠ Erro de conexão ao buscar o comprovante.', 'error');
      });
  }

  function renderizarModalComprovante(c) {
    var modalId = 'modal-comprovante-digital-overlay';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var statusMap = {
      'agendado': { label: 'Agendado', color: '#0284c7' },
      'em_rota': { label: 'Em Rota de Coleta', color: '#ea580c' },
      'concluido': { label: 'Coleta Concluída ✓', color: '#16a34a' },
      'cancelado': { label: 'Cancelado', color: '#dc2626' }
    };
    var st = statusMap[c.status] || { label: (c.status || 'AGENDADO').toUpperCase(), color: '#16a34a' };

    var dataFmt = c.data_agendada;
    try {
      var parts = c.data_agendada.split('-');
      if (parts.length === 3) dataFmt = parts[2] + '/' + parts[1] + '/' + parts[0];
    } catch(e) {}

    var clienteEmail = (c.cliente && c.cliente.email) ? c.cliente.email : '';

    var html = `
    <div class="comprovante-overlay" id="${modalId}" onclick="fecharComprovanteDigital(event)">
      <div class="comprovante-modal-container" onclick="event.stopPropagation()">
        
        <!-- BARRA DE AÇÕES DO TOPO -->
        <div class="comprovante-actions-bar no-print">
          <div class="cab-title">
            <span class="cab-badge">Oficial Santos/SP</span>
            <strong>Comprovante de Coleta Digital</strong>
          </div>
          <div class="cab-buttons">
            <button type="button" class="cab-btn cab-btn-print" onclick="window.print()">
              🖨️ Imprimir / Salvar PDF
            </button>
            <button type="button" class="cab-btn cab-btn-email" onclick="enviarComprovanteEmail('${c.protocolo}', '${clienteEmail}')">
              ✉️ Enviar por E-mail
            </button>
            <button type="button" class="cab-btn cab-btn-close" onclick="fecharComprovanteDigital()" title="Fechar">✕</button>
          </div>
        </div>

        <!-- FOLHA DO COMPROVANTE OFICIAL (IMPRESSÃO / VISUALIZAÇÃO A4) -->
        <div class="comprovante-sheet printable-area">
          
          <!-- CABEÇALHO DO DOCUMENTO -->
          <div class="comp-header">
            <div class="comp-brand">
              <div class="comp-logo-box">
                <img src="img/logo-folha.png" alt="EcoCall" class="comp-logo-img">
              </div>
              <div class="comp-brand-stack">
                <h1 class="comp-logo-name">EcoCall</h1>
                <span class="comp-logo-sub">Plataforma de Coleta Seletiva & Reciclagem · Santos/SP</span>
              </div>
            </div>
            <div class="comp-protocol-box">
              <div class="comp-proto-lbl">PROTOCOLO DE RASTREIO</div>
              <div class="comp-proto-num">${c.protocolo}</div>
              <div class="comp-proto-status" style="background:${st.color}18;color:${st.color};border-color:${st.color}40;">
                ${st.label}
              </div>
            </div>
          </div>

          <div class="comp-divider"></div>

          <!-- TÍTULO DA ORDEM DE SERVIÇO -->
          <div class="comp-doc-title-row">
            <div>
              <h2 class="comp-doc-title">COMPROVANTE OFICIAL DE COLETA & DESTINAÇÃO SUSTENTÁVEL</h2>
              <p class="comp-doc-desc">Documento digital emitido eletronicamente para comprovação e rastreabilidade ambiental.</p>
            </div>
            <div class="comp-seal">
              <div class="comp-seal-icon">✓</div>
              <div class="comp-seal-text">ECOCALL<br>VERIFIED</div>
            </div>
          </div>

          <!-- GRID DE PARTICIPANTES (SOLICITANTE & COLETOR) -->
          <div class="comp-grid-parties">
            <div class="comp-party-card">
              <div class="comp-party-head">1. DADOS DO SOLICITANTE (CIDADÃO / CONDOMÍNIO)</div>
              <div class="comp-party-body">
                <div class="comp-field"><span class="cfl">Nome / Titular:</span> <strong>${escapeHtml(c.cliente.nome)}</strong></div>
                <div class="comp-field"><span class="cfl">CPF / Documento:</span> <span>${escapeHtml(c.cliente.cpf || 'Não informado')}</span></div>
                <div class="comp-field"><span class="cfl">E-mail:</span> <span>${escapeHtml(c.cliente.email || 'Não informado')}</span></div>
                <div class="comp-field"><span class="cfl">Telefone:</span> <span>${escapeHtml(c.cliente.telefone || 'Não informado')}</span></div>
                <div class="comp-field"><span class="cfl">Endereço de Retirada:</span> <strong>${escapeHtml(c.endereco_coleta)}</strong></div>
                <div class="comp-field"><span class="cfl">Município:</span> <span>${escapeHtml(c.cliente.cidade || 'Santos')} / ${escapeHtml(c.cliente.uf || 'SP')}</span></div>
              </div>
            </div>

            <div class="comp-party-card">
              <div class="comp-party-head">2. DADOS DA EMPRESA / COOPERATIVA PARCEIRA</div>
              <div class="comp-party-body">
                <div class="comp-field"><span class="cfl">Razão Social:</span> <strong>${escapeHtml(c.empresa.nome)}</strong></div>
                <div class="comp-field"><span class="cfl">CNPJ:</span> <span>${escapeHtml(c.empresa.cnpj || 'Cadastrado no Sistema')}</span></div>
                <div class="comp-field"><span class="cfl">Categoria:</span> <span>${escapeHtml(c.empresa.categoria || 'Reciclagem e Coleta')}</span></div>
                <div class="comp-field"><span class="cfl">Contato:</span> <span>${escapeHtml(c.empresa.telefone || '(13) 3200-0000')}</span></div>
                <div class="comp-field"><span class="cfl">E-mail Corporativo:</span> <span>${escapeHtml(c.empresa.email || 'contato@ecocall.com.br')}</span></div>
                <div class="comp-field"><span class="cfl">Base Operacional:</span> <span>${escapeHtml(c.empresa.cidade || 'Santos')} / ${escapeHtml(c.empresa.uf || 'SP')}</span></div>
              </div>
            </div>
          </div>

          <!-- ESPECIFICAÇÃO DOS RESÍDUOS E AGENDAMENTO -->
          <div class="comp-section-box">
            <div class="comp-section-head">3. ESPECIFICAÇÕES DOS RESÍDUOS & PROGRAMAÇÃO</div>
            <div class="comp-specs-grid">
              <div class="comp-spec-item">
                <div class="cs-label">Material / Resíduos</div>
                <div class="cs-value cs-highlight">${escapeHtml(c.tipo_residuo)}</div>
              </div>
              <div class="comp-spec-item">
                <div class="cs-label">Massa Estimada</div>
                <div class="cs-value">${c.peso_estimado_kg.toLocaleString('pt-BR', {minimumFractionDigits:1})} kg</div>
              </div>
              <div class="comp-spec-item">
                <div class="cs-label">Data Agendada</div>
                <div class="cs-value">${dataFmt}</div>
              </div>
              <div class="comp-spec-item">
                <div class="cs-label">Turno de Coleta</div>
                <div class="cs-value">${escapeHtml(c.turno)}</div>
              </div>
            </div>
            ${c.observacoes ? `<div class="comp-obs-row"><strong>Instruções do Solicitante:</strong> ${escapeHtml(c.observacoes)}</div>` : ''}
          </div>

          <!-- IMPACTO AMBIENTAL GERADO -->
          <div class="comp-impact-banner">
            <div class="cib-icon">🌱</div>
            <div class="cib-content">
              <strong>Impacto Ecológico Positivo Estimado:</strong>
              <div>Evitou a emissão de aproximadamente <strong>${c.impacto.co2_evitado_kg} kg de CO₂</strong> e poupou cerca de <strong>${c.impacto.litros_agua}L de água</strong> em Santos.</div>
            </div>
          </div>

          <!-- AUTENTICAÇÃO DIGITAL E ASSINATURAS -->
          <div class="comp-auth-box">
            <div class="comp-auth-grid">
              <div>
                <div class="cauth-lbl">AUTENTICAÇÃO DIGITAL DE SEGURANÇA</div>
                <div class="cauth-hash">HASH: ${c.hash_autenticacao}</div>
                <div class="cauth-sub">Emissão eletrônica: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · EcoCall Core Engine</div>
              </div>
              <div class="comp-qr-mock">
                <div class="cqr-text">ECOCALL<br>VERIFIED<br>✓</div>
              </div>
            </div>
          </div>

          <div class="comp-signatures">
            <div class="comp-sig-col">
              <div class="sig-line"></div>
              <span>Assinatura do Solicitante / Munícipe</span>
            </div>
            <div class="comp-sig-col">
              <div class="sig-line"></div>
              <span>Assinatura da Cooperativa / Coletor</span>
            </div>
          </div>

          <div class="comp-footer-note">
            EcoCall Santos · Conectando munícipes a empresas de reciclagem credenciadas para um futuro sustentável.
          </div>

        </div> <!-- Fim de comprovante-sheet -->

      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';
  }

  function fecharComprovanteDigital(event) {
    if (event && event.target && event.target.id !== 'modal-comprovante-digital-overlay') return;
    var el = document.getElementById('modal-comprovante-digital-overlay');
    if (el) el.remove();
    document.body.style.overflow = '';
  }

  function enviarComprovanteEmail(protocolo, defaultEmail) {
    var email = prompt('Informe o e-mail para onde deseja enviar o comprovante oficial:', defaultEmail || '');
    if (!email) return;

    email = email.trim();
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast('⚠ Por favor, informe um endereço de e-mail válido.', 'warning');
      return;
    }

    toast('✉️ Enviando comprovante oficial para ' + email + '...', 'info');

    apiFetch('api/coletas/email_comprovante.php', {
      method: 'POST',
      body: JSON.stringify({ protocolo: protocolo, email: email })
    })
    .then(function (res) {
      if (res && res.success) {
        toast('✓ Comprovante enviado com sucesso para ' + email + '!', 'success', 4500);
      } else {
        toast('⚠ ' + (res && res.error ? res.error : 'Não foi possível enviar o e-mail no momento.'), 'warning');
      }
    })
    .catch(function () {
      toast('⚠ Erro de comunicação com o servidor ao enviar o e-mail.', 'error');
    });
  }

  function imprimirComprovantePDF(protocoloOrId) {
    abrirComprovanteDigital(protocoloOrId);
  }

  function initColetasSSE() {
    if (typeof EventSource === 'undefined') return;
    try {
      var isFirstSSE = true;
      var lastSeenChecksum = null;
      var es = new EventSource('api/coletas/sse.php');

      es.addEventListener('status_updated', function (e) {
        try {
          var data = JSON.parse(e.data);
          if (data && data.latest) {
            var proto = data.latest.protocolo || ('COL-' + data.latest.id);
            var st = data.latest.status || '';
            var currentChecksum = proto + ':' + st;

            // Só exibe popup se for uma alteração real ocorrida após o carregamento inicial
            if (!isFirstSSE && lastSeenChecksum !== null && lastSeenChecksum !== currentChecksum) {
              toast('🌱 Protocolo ' + proto + ' atualizado em tempo real: "' + st + '"!');
            }

            isFirstSSE = false;
            lastSeenChecksum = currentChecksum;
            
            if (window.carregarColetasDoBanco) window.carregarColetasDoBanco();
            if (window.carregarPainelUsuario) window.carregarPainelUsuario();
            if (window.carregarRelatoriosEmpresa) window.carregarRelatoriosEmpresa();
          }
        } catch (err) {}
      });

      es.addEventListener('initial_state', function (e) {
        try {
          var data = JSON.parse(e.data);
          if (data && data.latest) {
            var proto = data.latest.protocolo || ('COL-' + data.latest.id);
            var st = data.latest.status || '';
            lastSeenChecksum = proto + ':' + st;
          }
        } catch(err) {}
        isFirstSSE = false;
      });
    } catch (err) {}
  }

  function highlightActiveNav() {
    var current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var links = document.querySelectorAll('.sidebar-menu .nav-item, .nav-menu .nav-link');
    links.forEach(function (link) {
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (href && href === current) link.classList.add('active');
    });
  }

  window.escapeHtml = escapeHtml;
  window.toggleMobileSidebar = toggleMobileSidebar;
  window.toast = toast;
  window.transicaoPara = transicaoPara;
  window.logout = logout;
  window.showLoader = showLoader;
  window.apiFetch = apiFetch;
  window.syncUserProfile = syncUserProfile;
  window.applyUserDataToDOM = applyUserDataToDOM;
  window.imprimirComprovantePDF = imprimirComprovantePDF;
  window.abrirComprovanteDigital = abrirComprovanteDigital;
  window.fecharComprovanteDigital = fecharComprovanteDigital;
  window.enviarComprovanteEmail = enviarComprovanteEmail;
  window.initColetasSSE = initColetasSSE;

  document.addEventListener('DOMContentLoaded', function () {
    highlightActiveNav();
    syncUserProfile();
    initColetasSSE();
  });
})();
