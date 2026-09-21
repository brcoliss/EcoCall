/* ==========================================================================
   EcoCall — Painel do Usuário Cidadão (Dashboard Dinâmico & SPA Unificado)
   Centraliza a navegação SPA entre todas as abas (Painel, Minhas Coletas,
   Empresas Salvas, Mapa Interativo, Histórico & Pontos, Meu Perfil),
   gerenciamento de coletas, busca em tempo real, integração ViaCEP e FPDF.
   ========================================================================== */
(function () {
  'use strict';

  var activeColetasFilter = 'all';
  var currentColetasView = 'grid';
  var cachedColetas = [];
  var cachedEmpresas = [];
  var mapInstance = null;
  var markersMap = {};
  var currentEvalRating = 5;
  var empresasMateriaisMap = {};

  var escapeHtml = window.escapeHtml || function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };

  var todosMateriais = [
    { name: 'Plástico', icon: '♻️' },
    { name: 'Papel', icon: '📦' },
    { name: 'Metal', icon: '🥫' },
    { name: 'Vidro', icon: '🍾' },
    { name: 'Eletrônicos', icon: '💻' },
    { name: 'Óleo de Cozinha', icon: '🛢️' },
    { name: 'Orgânico', icon: '🍎' },
    { name: 'Têxtil', icon: '👕' }
  ];

  var defaultSantosCompanies = [
    { id: 1, razao_social: 'Santista Ambiental Ltda', bairro: 'Centro', cidade: 'Santos', uf: 'SP', categoria: 'Plásticos, Papéis e Metais', tipo: 'coop', icon: '♻️', nota_media: 4.9, lat: -23.933200, lng: -46.328900, endereco: 'Rua do Comércio, 100 Galpão 3 - Centro, Santos/SP' },
    { id: 2, razao_social: 'Recicla Baixada S/A', bairro: 'Boqueirão', cidade: 'Santos', uf: 'SP', categoria: 'Metais e Vidro', tipo: 'spec', icon: '🥫', nota_media: 5.0, lat: -23.962500, lng: -46.324200, endereco: 'Rua Oswaldo Cruz, 45 - Boqueirão, Santos/SP' },
    { id: 3, razao_social: 'Terra Santos Ambiental (Consórcio Público)', bairro: 'Macuco', cidade: 'Santos', uf: 'SP', categoria: 'Coleta Seletiva Pública & Cata-Treco', tipo: 'coop', icon: '🏢', nota_media: 4.9, lat: -23.955400, lng: -46.321850, endereco: 'Av. Siqueira Campos, 120 - Macuco, Santos/SP' },
    { id: 4, razao_social: 'ONG Sem Fronteiras (Cooperativa)', bairro: 'Paquetá', cidade: 'Santos', uf: 'SP', categoria: 'Cooperativa de Recicladores', tipo: 'coop', icon: '♻️', nota_media: 4.85, lat: -23.932820, lng: -46.324150, endereco: 'Rua da Constituição, 75 - Paquetá, Santos/SP' },
    { id: 6, razao_social: 'Alquimista Reciclagem', bairro: 'Macuco', cidade: 'Santos', uf: 'SP', categoria: 'Gerenciamento de Resíduos Privados', tipo: 'spec', icon: '🥫', nota_media: 4.95, lat: -23.954200, lng: -46.320980, endereco: 'Av. Siqueira Campos, 61 - Macuco, Santos/SP' },
    { id: 7, razao_social: 'Recimar Reciclagem & Sucata', bairro: 'Estuário', cidade: 'Santos', uf: 'SP', categoria: 'Reciclagem Industrial & Metais', tipo: 'spec', icon: '🥫', nota_media: 4.75, lat: -23.968940, lng: -46.307520, endereco: 'Av. Senador Dantas, 259 - Estuário, Santos/SP' },
    { id: 8, razao_social: 'Fundação Settaport (Lixo Eletrônico REEE)', bairro: 'Paquetá', cidade: 'Santos', uf: 'SP', categoria: 'Resíduos Eletrônicos (REEE)', tipo: 'reee', icon: '💻', nota_media: 4.9, lat: -23.934890, lng: -46.325980, endereco: 'Av. Conselheiro Nébias, 85 - Paquetá, Santos/SP' },
    { id: 9, razao_social: 'Reciclar é Viver (Cooperativa Comunidade)', bairro: 'Vila Mathias', cidade: 'Santos', uf: 'SP', categoria: 'Óleo de Cozinha & Plásticos', tipo: 'coop', icon: '🛢️', nota_media: 4.85, lat: -23.951470, lng: -46.336120, endereco: 'Rua Carvalho de Mendonça, 310 - Vila Mathias, Santos/SP' },
    { id: 10, razao_social: 'Santista Ambiental', bairro: 'Gonzaga', cidade: 'Santos', uf: 'SP', categoria: 'Caçambas & Coleta Especial', tipo: 'coop', icon: '🌱', nota_media: 4.7, lat: -23.958740, lng: -46.332850, endereco: 'Av. Ana Costa, 150 - Gonzaga, Santos/SP' },
    { id: 901, razao_social: 'Ecoponto Municipal - Vila Nova', bairro: 'Vila Nova', cidade: 'Santos', uf: 'SP', categoria: 'Ecoponto Municipal (Entulho & Recicláveis)', tipo: 'coop', icon: '📦', nota_media: 4.8, lat: -23.942150, lng: -46.328920, endereco: 'Rua São Paulo, 120 - Vila Nova, Santos/SP' },
    { id: 902, razao_social: 'Ecoponto Municipal - Campo Grande', bairro: 'Campo Grande', cidade: 'Santos', uf: 'SP', categoria: 'Ecoponto Municipal (Grandes Volumes)', tipo: 'coop', icon: '📦', nota_media: 4.9, lat: -23.958430, lng: -46.345890, endereco: 'Rua Carvalho de Mendonça, 510 - Campo Grande, Santos/SP' },
    { id: 903, razao_social: 'Ecoponto Municipal - Marapé', bairro: 'Marapé', cidade: 'Santos', uf: 'SP', categoria: 'Ecoponto Municipal (Bairro Marapé)', tipo: 'coop', icon: '📦', nota_media: 4.8, lat: -23.965310, lng: -46.342120, endereco: 'Rua São Judas Tadeu, 80 - Marapé, Santos/SP' },
    { id: 904, razao_social: 'Ecoponto Municipal - Ponta da Praia', bairro: 'Ponta da Praia', cidade: 'Santos', uf: 'SP', categoria: 'Ecoponto Municipal (Orla e Estuário)', tipo: 'coop', icon: '📦', nota_media: 4.8, lat: -23.985620, lng: -46.301450, endereco: 'Av. Rei Alberto I, 180 - Ponta da Praia, Santos/SP' }
  ];

  var monthsNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  /* ==========================================================================
     1. CONTROLE DE NAVEGAÇÃO POR ABAS (SPA)
     ========================================================================== */
  function switchUserTab(tabName, el) {
    if (!tabName) tabName = 'dash';

    if (window.toggleMobileSidebar) {
      window.toggleMobileSidebar(false);
    }

    var navItems = document.querySelectorAll('.sidebar-menu .nav-item');
    navItems.forEach(function (item) {
      item.classList.remove('active');
    });

    if (el) {
      el.classList.add('active');
    } else {
      var targetLink = document.querySelector('.sidebar-menu .nav-item[data-tab="' + tabName + '"]');
      if (targetLink) targetLink.classList.add('active');
    }

    var tabs = document.querySelectorAll('.user-tab-content');
    tabs.forEach(function (t) {
      t.style.display = 'none';
    });

    var activeTab = document.getElementById('tab-' + tabName);
    if (activeTab) {
      activeTab.style.display = 'block';
    }

    var subEl = document.getElementById('dash-topbar-sub');
    var greetingEl = document.getElementById('dash-greeting');

    var titlesMap = {
      dash: { title: 'Olá 👋', sub: 'Gere e acompanhe as suas contribuições sustentáveis.' },
      coletas: { title: 'Minhas Coletas 📋', sub: 'Acompanhe o histórico, status e solicite novas coletas.' },
      empresas: { title: 'Empresas Salvas 🏢', sub: 'Conheça e solicite agendamentos com empresas parceiras credenciadas.' },
      mapa: { title: 'Ver no Mapa 🗺️', sub: 'Localize cooperativas, ecopontos e empresas coletoras na sua região.' },
      historico: { title: 'Histórico & Pontos 🌱', sub: 'Seu extrato completo de reciclagens realizadas e pontuações.' },
      perfil: { title: 'Meu Perfil 👤', sub: 'Mantenha seus dados cadastrais e de acesso sempre atualizados.' }
    };

    var info = titlesMap[tabName] || titlesMap['dash'];

    if (tabName === 'dash') {
      try {
        var stored = sessionStorage.getItem('ecocall_user');
        if (stored) {
          var u = JSON.parse(stored);
          var nome = u.nome || u.razao_social || 'Usuário';
          var primeiroNome = nome.split(' ')[0];
          var hr = new Date().getHours();
          var saudacao = hr < 12 ? 'Bom dia' : (hr < 18 ? 'Boa tarde' : 'Boa noite');
          if (greetingEl) greetingEl.textContent = saudacao + ', ' + primeiroNome + ' 👋';
        } else if (greetingEl) {
          greetingEl.textContent = 'Olá 👋';
        }
      } catch (e) {
        if (greetingEl) greetingEl.textContent = 'Olá 👋';
      }
    } else if (greetingEl) {
      greetingEl.textContent = info.title;
    }

    if (subEl) subEl.textContent = info.sub;

    if (tabName === 'coletas') {
      carregarColetasDoBanco();
    } else if (tabName === 'empresas') {
      renderizarEmpresasDisponiveis(cachedEmpresas.length > 0 ? cachedEmpresas : defaultSantosCompanies);
    } else if (tabName === 'mapa') {
      setTimeout(function () {
        initLeafletMap(cachedEmpresas.length > 0 ? cachedEmpresas : defaultSantosCompanies);
      }, 150);
    } else if (tabName === 'historico') {
      renderizarHistoricoAtividades(cachedColetas);
    } else if (tabName === 'perfil') {
      carregarPerfilUsuario();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ==========================================================================
     2. CARREGAMENTO GERAL DO PAINEL DE USUÁRIO
     ========================================================================== */
  function carregarPainelUsuario() {
    if (!window.apiFetch) return;

    if (window.syncUserProfile) {
      window.syncUserProfile();
    }

    // Carrega Estatísticas Principais
    window.apiFetch('api/dashboard/stats.php').then(function (res) {
      if (res && res.success && res.stats) {
        var st = res.stats;
        var mConcluidas = document.getElementById('dash-m-concluidas');
        var mPontos = document.getElementById('dash-m-pontos');
        var mPeso = document.getElementById('dash-m-peso');
        var mCo2 = document.getElementById('dash-m-co2');

        var histPontos = document.getElementById('hist-stat-pontos');
        var histColetas = document.getElementById('hist-stat-coletas');
        var histCo2 = document.getElementById('hist-stat-co2');

        var concluidas = st.coletas_concluidas || 0;
        var pontos = st.pontos || 0;
        var peso = st.peso_total_kg || 0;
        var co2 = st.co2_economizado_kg || 0;

        if (mConcluidas) mConcluidas.textContent = concluidas;
        if (mPontos) mPontos.innerHTML = pontos + ' <span class="m-unit">pts</span>';
        if (mPeso) mPeso.innerHTML = peso + ' <span class="m-unit">kg</span>';
        if (mCo2) mCo2.textContent = '~' + co2 + ' kg CO₂ evitados';

        if (histPontos) histPontos.textContent = pontos + ' pts';
        if (histColetas) histColetas.textContent = concluidas;
        if (histCo2) histCo2.textContent = co2 + ' kg';
      }
    }).catch(function (err) {
      console.warn('Erro ao carregar estatísticas:', err);
    });

    // Carrega Coletas do Usuário
    window.apiFetch('api/coletas/index.php').then(function (res) {
      if (res && res.success && Array.isArray(res.coletas)) {
        cachedColetas = res.coletas;
        atualizarContadoresColetas(res.coletas);
        renderizarTabelaColetas(res.coletas);
        renderizarMinhasColetas(res.coletas);
        renderizarHistoricoAtividades(res.coletas);
      }
    }).catch(function (err) {
      console.warn('Erro ao carregar coletas recentes:', err);
    });

    // Carrega Empresas Parceiras
    window.apiFetch('api/empresas/index.php').then(function (res) {
      if (res && res.success && Array.isArray(res.empresas) && res.empresas.length > 0) {
        cachedEmpresas = res.empresas;
      } else {
        cachedEmpresas = defaultSantosCompanies;
      }
      renderizarEmpresasDisponiveis(cachedEmpresas);
      var mEmpresas = document.getElementById('dash-m-empresas');
      var empCountVal = document.getElementById('emp-count-val');
      if (mEmpresas) mEmpresas.textContent = cachedEmpresas.length;
      if (empCountVal) empCountVal.textContent = cachedEmpresas.length;
      carregarEmpresasNoSelect();
    }).catch(function (err) {
      console.warn('Erro ao carregar empresas parceiras:', err);
      cachedEmpresas = defaultSantosCompanies;
      renderizarEmpresasDisponiveis(cachedEmpresas);
      carregarEmpresasNoSelect();
    });

    var params = new URLSearchParams(location.search);
    var targetTab = params.get('tab') || (location.hash || '').replace('#', '').toLowerCase();
    if (targetTab && ['dash', 'coletas', 'empresas', 'mapa', 'historico', 'perfil'].indexOf(targetTab) !== -1) {
      switchUserTab(targetTab);
    }
  }

  /* ==========================================================================
     3. RENDERIZAÇÃO DA TABELA RECENTES (PAINEL GERAL)
     ========================================================================== */
  function renderizarTabelaColetas(coletas) {
    var tbody = document.getElementById('dash-coletas-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!coletas || coletas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-grey);padding:2rem;">Você ainda não possui solicitações de coleta ativas. <a href="javascript:void(0)" onclick="openRequestModal()" style="color:var(--brand-green-hover);font-weight:600;">Clique aqui para agendar</a></td></tr>';
      return;
    }

    var statusMap = {
      'pendente': { label: 'Pendente', badgeCls: 'badge-sched' },
      'agendado': { label: 'Agendada', badgeCls: 'badge-sched' },
      'em_andamento': { label: 'Em andamento', badgeCls: 'badge-prog' },
      'concluido': { label: 'Concluída', badgeCls: 'badge-done' },
      'cancelado': { label: 'Cancelada', badgeCls: 'badge-cancel' }
    };

    coletas.slice(0, 5).forEach(function (c) {
      var tr = document.createElement('tr');
      var companyName = c.empresa_nome || 'EcoColeta Santos';
      var letter = escapeHtml(companyName.charAt(0).toUpperCase());
      var rawDate = c.data_agendada || '';
      var parts = rawDate.split('-');
      var dateFmt = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : rawDate;
      var stInfo = statusMap[c.status] || statusMap['agendado'];
      var orderId = c.protocolo || ('COL-' + strPad(c.id, 6));

      var btnHtml = '<button class="btn-card-action" onclick="switchUserTab(\'coletas\')">Detalhes</button>';
      if (c.status === 'concluido') {
        btnHtml = '<button class="btn-card-action primary" onclick="abrirComprovanteDigital(\'' + escapeHtml(orderId) + '\')">📄 Comprovante</button>';
      }

      tr.innerHTML =
        '<td>' +
          '<div class="table-comp-info">' +
            '<div class="comp-letter text-green-bg">' + letter + '</div>' +
            '<div><strong>' + escapeHtml(companyName) + '</strong><div style="font-size:0.75rem;color:var(--text-grey);">' + escapeHtml(orderId) + '</div></div>' +
          '</div>' +
        '</td>' +
        '<td><span class="etag tag-plastic">' + escapeHtml(c.tipo_residuo || 'Resíduos Recicláveis') + '</span></td>' +
        '<td>' + escapeHtml(dateFmt) + '</td>' +
        '<td><span class="badge ' + stInfo.badgeCls + '">' + stInfo.label + '</span></td>' +
        '<td>' + btnHtml + '</td>';

      tbody.appendChild(tr);
    });
  }

  /* ==========================================================================
     4. RENDERIZAÇÃO DA ABA MINHAS COLETAS (CARDS & TABELA)
     ========================================================================== */
  function carregarColetasDoBanco() {
    if (!window.apiFetch) return;
    window.apiFetch('api/coletas/index.php').then(function (res) {
      if (res && res.success && Array.isArray(res.coletas)) {
        cachedColetas = res.coletas;
        atualizarContadoresColetas(res.coletas);
        renderizarMinhasColetas(res.coletas);
        renderizarHistoricoAtividades(res.coletas);
      }
    });
  }

  function atualizarContadoresColetas(coletas) {
    var total = coletas.length;
    var sched = 0;
    var prog = 0;
    var done = 0;
    var cancel = 0;

    coletas.forEach(function (c) {
      if (c.status === 'agendado' || c.status === 'pendente') sched++;
      else if (c.status === 'em_andamento') prog++;
      else if (c.status === 'concluido') done++;
      else if (c.status === 'cancelado') cancel++;
    });

    var badgeColetas = document.getElementById('usr-badge-coletas');
    var notifCount = document.getElementById('usr-notif-count');
    if (badgeColetas) badgeColetas.textContent = sched + prog;
    if (notifCount) notifCount.textContent = sched + prog;

    // Mini Stats Topo
    var elTotal = document.getElementById('usr-stat-total');
    var elProg = document.getElementById('usr-stat-prog');
    var elDone = document.getElementById('usr-stat-concluidas');
    var elCancel = document.getElementById('usr-stat-canceladas');

    if (elTotal) elTotal.textContent = total;
    if (elProg) elProg.textContent = sched + prog;
    if (elDone) elDone.textContent = done;
    if (elCancel) elCancel.textContent = cancel;

    // Badge Counters das Abas
    var tabAll = document.getElementById('count-tab-all');
    var tabSched = document.getElementById('count-tab-sched');
    var tabProg = document.getElementById('count-tab-prog');
    var tabDone = document.getElementById('count-tab-done');
    var tabCancel = document.getElementById('count-tab-cancel');

    if (tabAll) tabAll.textContent = total;
    if (tabSched) tabSched.textContent = sched;
    if (tabProg) tabProg.textContent = prog;
    if (tabDone) tabDone.textContent = done;
    if (tabCancel) tabCancel.textContent = cancel;
  }

  function toggleColetasView(viewType) {
    currentColetasView = viewType || 'grid';

    var btnCards = document.getElementById('btn-view-cards');
    var btnTable = document.getElementById('btn-view-table');
    var gridEl = document.getElementById('coletas-grid');
    var tableSec = document.getElementById('coletas-table-section');

    if (currentColetasView === 'grid') {
      if (btnCards) btnCards.classList.add('active');
      if (btnTable) btnTable.classList.remove('active');
      if (gridEl) gridEl.style.display = 'flex';
      if (tableSec) tableSec.style.display = 'none';
    } else {
      if (btnCards) btnCards.classList.remove('active');
      if (btnTable) btnTable.classList.add('active');
      if (gridEl) gridEl.style.display = 'none';
      if (tableSec) tableSec.style.display = 'block';
    }
  }

  function setColetasFilter(el, filterKey) {
    activeColetasFilter = filterKey || 'all';

    var tabs = document.querySelectorAll('#tab-coletas .tab-btn');
    tabs.forEach(function (btn) { btn.classList.remove('active'); });
    if (el) el.classList.add('active');

    filterColetasRows();
  }

  function filterColetasRows() {
    var searchInput = document.getElementById('search-coletas');
    var query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    var filtered = cachedColetas.filter(function (c) {
      var st = c.status || 'agendado';
      var matchFilter = true;

      if (activeColetasFilter === 'sched') {
        matchFilter = (st === 'agendado' || st === 'pendente');
      } else if (activeColetasFilter === 'prog') {
        matchFilter = (st === 'em_andamento');
      } else if (activeColetasFilter === 'done') {
        matchFilter = (st === 'concluido');
      } else if (activeColetasFilter === 'cancel') {
        matchFilter = (st === 'cancelado');
      }

      if (!matchFilter) return false;

      if (!query) return true;

      var emp = (c.empresa_nome || '').toLowerCase();
      var proto = (c.protocolo || '').toLowerCase();
      var mat = (c.tipo_residuo || '').toLowerCase();
      var end = (c.endereco_coleta || '').toLowerCase();

      return emp.includes(query) || proto.includes(query) || mat.includes(query) || end.includes(query);
    });

    renderizarMinhasColetas(filtered);
  }

  function renderizarMinhasColetas(coletas) {
    var grid = document.getElementById('coletas-grid');
    var tbody = document.getElementById('coletas-tbody');
    var emptyEl = document.getElementById('empty-state');

    if (grid) grid.innerHTML = '';
    if (tbody) tbody.innerHTML = '';

    if (!coletas || coletas.length === 0) {
      if (emptyEl) emptyEl.classList.add('show');
      return;
    } else if (emptyEl) {
      emptyEl.classList.remove('show');
    }

    var statusMap = {
      'pendente': { label: 'Pendente', badgeCls: 'badge-sched' },
      'agendado': { label: 'Agendada', badgeCls: 'badge-sched' },
      'em_andamento': { label: 'Em andamento', badgeCls: 'badge-prog' },
      'concluido': { label: 'Concluída', badgeCls: 'badge-done' },
      'cancelado': { label: 'Cancelada', badgeCls: 'badge-cancel' }
    };

    coletas.forEach(function (c) {
      var companyName = c.empresa_nome || 'EcoColeta Santos';
      var letter = escapeHtml(companyName.charAt(0).toUpperCase());
      var orderId = c.protocolo || ('COL-' + strPad(c.id, 6));
      var rawDate = c.data_agendada || '';
      var parts = rawDate.split('-');
      var dayNum = parts.length === 3 ? parts[2] : '15';
      var monthName = parts.length === 3 ? monthsNames[parseInt(parts[1], 10) - 1] + '/' + parts[0].substring(2) : 'AGO/26';
      var dateFmt = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : rawDate;
      var stInfo = statusMap[c.status] || statusMap['agendado'];
      var weight = (parseFloat(c.peso_estimado_kg || 1)).toFixed(1);
      var tiposText = c.tipo_residuo || 'Recicláveis';

      var tags = tiposText.split(',').map(function (t) {
        return '<span class="etag tag-plastic">' + escapeHtml(t.trim()) + '</span>';
      }).join(' ');

      // Ações dos Cards
      var actionsCardHtml = '';
      actionsCardHtml += '<button class="btn-card-action primary" onclick="event.stopPropagation();abrirComprovanteDigital(\'' + escapeHtml(orderId) + '\')">📄 Comprovante</button>';
      if (c.status === 'concluido') {
        if (c.avaliacao_id || c.avaliacao_nota) {
          actionsCardHtml += '<span class="btn-card-action" style="margin-left:4px;background:#ecfdf5;color:#15803d;border-color:#bbf7d0;font-size:0.75rem;cursor:default;">✓ Avaliado ★ ' + (c.avaliacao_nota || 5) + '</span>';
        } else {
          actionsCardHtml += '<button class="btn-card-action" style="margin-left:4px;background:#fef3c7;color:#b45309;border-color:#fde68a;font-weight:700;" onclick="event.stopPropagation();openEvalModal(' + c.id + ', \'' + escapeHtml(companyName).replace(/'/g, "\\'") + '\')">⭐ Avaliar (+10 pts)</button>';
        }
      } else if (c.status === 'pendente' || c.status === 'agendado') {
        actionsCardHtml += '<button class="btn-card-action" style="margin-left:4px;color:#b53b3b;border-color:#f0ccc8;" onclick="event.stopPropagation();cancelarMinhaColeta(' + c.id + ')">✕</button>';
      }

      // 1. Renderiza no Grid de Cards
      if (grid) {
        var card = document.createElement('div');
        card.className = 'coleta-card';
        card.onclick = function () { openDetailModal(c.id); };

        card.innerHTML =
          '<div class="coleta-avatar av-green">' + letter + '</div>' +
          '<div class="coleta-info">' +
            '<div class="coleta-company">' + escapeHtml(companyName) + '</div>' +
            '<div class="coleta-tags">' + tags + '</div>' +
          '</div>' +
          '<div class="coleta-date"><div class="date-day">' + escapeHtml(dayNum) + '</div><div class="date-month">' + escapeHtml(monthName) + '</div></div>' +
          '<div class="coleta-weight"><div class="weight-val">' + escapeHtml(weight) + ' kg</div><div class="weight-lbl">Estimado</div></div>' +
          '<div class="coleta-right">' +
            '<span class="badge ' + stInfo.badgeCls + '">' + stInfo.label + '</span>' +
            '<div style="display:flex;align-items:center;">' + actionsCardHtml + '</div>' +
          '</div>';

        grid.appendChild(card);
      }

      // 2. Renderiza na Tabela
      if (tbody) {
        var tr = document.createElement('tr');
        var actionsTableHtml = '<div style="display:flex;gap:0.4rem;align-items:center;">';
        actionsTableHtml += '<button class="btn-card-action" title="Ver detalhes" onclick="openDetailModal(' + c.id + ')">👁️ Detalhes</button>';
        actionsTableHtml += '<button class="btn-card-action primary" title="Ver Comprovante Oficial" onclick="abrirComprovanteDigital(\'' + escapeHtml(orderId) + '\')">📄 Comprovante</button>';

        if (c.status === 'concluido') {
          if (c.avaliacao_id || c.avaliacao_nota) {
            actionsTableHtml += '<span class="btn-card-action" style="background:#ecfdf5;color:#15803d;border-color:#bbf7d0;font-size:0.75rem;cursor:default;">✓ Avaliado ★ ' + (c.avaliacao_nota || 5) + '</span>';
          } else {
            actionsTableHtml += '<button class="btn-card-action" style="background:#fef3c7;color:#b45309;border-color:#fde68a;font-weight:700;" onclick="openEvalModal(' + c.id + ', \'' + escapeHtml(companyName).replace(/'/g, "\\'") + '\')">⭐ Avaliar (+10 pts)</button>';
          }
        } else if (c.status === 'pendente' || c.status === 'agendado') {
          actionsTableHtml += '<button class="btn-card-action" style="color:#b53b3b;border-color:#f0ccc8;" onclick="cancelarMinhaColeta(' + c.id + ')">✕</button>';
        }
        actionsTableHtml += '</div>';

        tr.innerHTML =
          '<td>' +
            '<div class="table-comp-info">' +
              '<div class="comp-letter text-green-bg">' + letter + '</div>' +
              '<div><strong>' + escapeHtml(companyName) + '</strong><div style="font-size:0.75rem;color:var(--text-grey);">' + escapeHtml(orderId) + '</div></div>' +
            '</div>' +
          '</td>' +
          '<td><span class="etag tag-plastic">' + escapeHtml(tiposText) + '</span></td>' +
          '<td>' + escapeHtml(dateFmt) + '</td>' +
          '<td><strong>' + escapeHtml(weight) + ' kg</strong></td>' +
          '<td><span class="badge ' + stInfo.badgeCls + '">' + stInfo.label + '</span></td>' +
          '<td>' + actionsTableHtml + '</td>';

        tbody.appendChild(tr);
      }
    });
  }

  function strPad(n, width) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
  }

  /* ==========================================================================
     5. RENDERIZAÇÃO DAS EMPRESAS PARCEIRAS (ABA EMPRESAS)
     ========================================================================== */
  function renderizarEmpresasDisponiveis(empresas) {
    var container = document.getElementById('dash-empresas-container');
    var tabContainer = document.getElementById('tab-empresas-list');

    if (container) container.innerHTML = '';
    if (tabContainer) tabContainer.innerHTML = '';

    if (!empresas || empresas.length === 0) {
      var emptyMsg = '<p style="color:var(--text-grey);font-size:0.88rem;">Nenhuma empresa cadastrada no momento.</p>';
      if (container) container.innerHTML = emptyMsg;
      if (tabContainer) tabContainer.innerHTML = emptyMsg;
      return;
    }

    empresas.forEach(function (emp, idx) {
      var name = emp.razao_social || 'Empresa Reciclagem';
      var city = (emp.bairro ? emp.bairro + ', ' : '') + (emp.cidade || 'Santos') + ' - ' + (emp.uf || 'SP');
      var cat = emp.categoria || 'Reciclagem Geral';
      var letter = name.charAt(0).toUpperCase();
      var nota = parseFloat(emp.nota_media || 5.0).toFixed(1);

      var card = document.createElement('div');
      card.className = 'dashboard-ecard';
      card.innerHTML =
        '<div class="db-ecard-left">' +
          '<div class="db-ecard-avatar">' + letter + '</div>' +
          '<div class="db-ecard-meta">' +
            '<h3>' + name + '</h3>' +
            '<p class="db-ecard-city">📍 ' + city + ' &bull; <strong style="color:var(--brand-green-hover);">' + cat + '</strong></p>' +
            '<div class="db-ecard-stars">★★★★★ <span class="rating-num">' + nota + '</span></div>' +
          '</div>' +
        '</div>' +
        '<button class="btn-c-dash" onclick="selecionarEmpresaNoModal(\'' + name.replace(/'/g, "\\'") + '\')">Chamar Coleta</button>';

      if (container && idx < 4) {
        container.appendChild(card.cloneNode(true));
      }
      if (tabContainer) {
        tabContainer.appendChild(card);
      }
    });
  }

  function filterEmpresasList() {
    var query = (document.getElementById('search-empresas') || {}).value || '';
    query = query.toLowerCase().trim();

    var list = cachedEmpresas.length > 0 ? cachedEmpresas : defaultSantosCompanies;
    var filtered = list.filter(function (emp) {
      var name = (emp.razao_social || '').toLowerCase();
      var cat = (emp.categoria || '').toLowerCase();
      var bairro = (emp.bairro || '').toLowerCase();
      return name.includes(query) || cat.includes(query) || bairro.includes(query);
    });

    var tabContainer = document.getElementById('tab-empresas-list');
    if (!tabContainer) return;
    tabContainer.innerHTML = '';

    if (filtered.length === 0) {
      tabContainer.innerHTML = '<p style="color:var(--text-grey);font-size:0.88rem;padding:1.5rem;text-align:center;">Nenhuma empresa encontrada para a busca "' + query + '".</p>';
      return;
    }

    filtered.forEach(function (emp) {
      var name = emp.razao_social || 'Empresa Reciclagem';
      var city = (emp.bairro ? emp.bairro + ', ' : '') + (emp.cidade || 'Santos') + ' - ' + (emp.uf || 'SP');
      var cat = emp.categoria || 'Reciclagem Geral';
      var letter = name.charAt(0).toUpperCase();
      var nota = parseFloat(emp.nota_media || 5.0).toFixed(1);

      var card = document.createElement('div');
      card.className = 'dashboard-ecard';
      card.innerHTML =
        '<div class="db-ecard-left">' +
          '<div class="db-ecard-avatar">' + letter + '</div>' +
          '<div class="db-ecard-meta">' +
            '<h3>' + name + '</h3>' +
            '<p class="db-ecard-city">📍 ' + city + ' &bull; <strong style="color:var(--brand-green-hover);">' + cat + '</strong></p>' +
            '<div class="db-ecard-stars">★★★★★ <span class="rating-num">' + nota + '</span></div>' +
          '</div>' +
        '</div>' +
        '<button class="btn-c-dash" onclick="selecionarEmpresaNoModal(\'' + name.replace(/'/g, "\\'") + '\')">Chamar Coleta</button>';

      tabContainer.appendChild(card);
    });
  }

  /* ==========================================================================
     6. PAINEL LATERAL DE DETALHES DA COLETA (DRAWER SLIDE PANEL)
     ========================================================================== */
  var badges = {
    done:   '<span class="badge badge-done">Concluída</span>',
    sched:  '<span class="badge badge-sched">Agendada</span>',
    prog:   '<span class="badge badge-prog">Em andamento</span>',
    cancel: '<span class="badge badge-cancel">Cancelada</span>'
  };

  function openDetailModal(coletaId) {
    var coleta = cachedColetas.find(function (c) { return c.id === coletaId; });
    if (!coleta) return;

    var company = coleta.empresa_nome || 'EcoColeta Santos';
    var loc = coleta.endereco_coleta || 'Santos, SP';
    var letter = company.charAt(0).toUpperCase();
    var status = coleta.status === 'concluido' ? 'done' : (coleta.status === 'cancelado' ? 'cancel' : (coleta.status === 'em_andamento' ? 'prog' : 'sched'));
    var weight = (parseFloat(coleta.peso_estimado_kg || 1)).toFixed(1);
    var tipos = coleta.tipo_residuo || 'Materiais Recicláveis';
    var orderId = coleta.protocolo || ('COL-' + strPad(coleta.id, 6));
    var rawDate = coleta.data_agendada || '';
    var parts = rawDate.split('-');
    var formattedDate = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : rawDate;

    document.getElementById('dp-title').textContent   = 'Coleta #' + orderId;
    document.getElementById('dp-company').textContent = company;
    document.getElementById('dp-loc').textContent     = '📍 ' + loc;
    document.getElementById('dp-id').textContent      = orderId;
    document.getElementById('dp-date').textContent    = formattedDate;
    document.getElementById('dp-tipos').textContent   = tipos;
    document.getElementById('dp-weight').textContent  = weight + ' kg';

    var av = document.getElementById('dp-avatar');
    if (av) {
      av.textContent = letter;
      av.className   = 'coleta-avatar av-green';
    }

    var b = document.getElementById('dp-badge');
    if (b) b.innerHTML = badges[status] || badges.sched;

    var actContainer = document.getElementById('dp-actions');
    if (actContainer) {
      var html = '<button class="btn-detail-primary" onclick="abrirComprovanteDigital(\'' + orderId + '\')">📄 Ver Comprovante Oficial</button>';
      if (coleta.status === 'concluido') {
        if (coleta.avaliacao_id || coleta.avaliacao_nota) {
          html += '<div style="background:#ecfdf5;color:#15803d;border:1px solid #bbf7d0;padding:8px 12px;border-radius:8px;font-size:0.82rem;font-weight:700;text-align:center;margin-top:0.4rem;">✓ Atendimento Avaliado com Nota ' + (coleta.avaliacao_nota || 5.0) + ' ★</div>';
        } else {
          html += '<button class="btn-detail-secondary" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;font-weight:700;" onclick="openEvalModal(' + coleta.id + ', \'' + company.replace(/'/g, "\\'") + '\')">⭐ Avaliar Atendimento (+10 pts)</button>';
        }
      } else if (coleta.status === 'pendente' || coleta.status === 'agendado') {
        html += '<button class="btn-detail-secondary" onclick="cancelarMinhaColeta(' + coleta.id + ')">✕ Cancelar Solicitação</button>';
      }
      actContainer.innerHTML = html;
    }

    var overlay = document.getElementById('overlay');
    var panel = document.getElementById('detail-panel');
    if (overlay) overlay.classList.add('open');
    if (panel) panel.classList.add('open');
  }

  function closeDetail() {
    var overlay = document.getElementById('overlay');
    var panel = document.getElementById('detail-panel');
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
  }

  function cancelarMinhaColeta(coletaId) {
    if (!confirm('Deseja realmente cancelar este agendamento de coleta?')) return;
    if (!window.apiFetch) return;

    window.apiFetch('api/coletas/update.php', {
      method: 'POST',
      body: { coleta_id: coletaId, status: 'cancelado' }
    }).then(function (res) {
      if (res && res.success) {
        window.toast('✓ ' + (res.message || 'Coleta cancelada com sucesso.'));
        closeDetail();
        carregarPainelUsuario();
      } else {
        window.toast('⚠ ' + (res.error || 'Erro ao cancelar coleta.'));
      }
    });
  }

  /* ==========================================================================
     7. MAPA INTERATIVO LEAFLET.JS (ABA VER NO MAPA)
     ========================================================================== */
  var markersMap = {};

  var santosBairrosCoords = {
    'gonzaga': { lat: -23.958740, lng: -46.332850 },
    'boqueirao': { lat: -23.969420, lng: -46.324180 },
    'boqueirão': { lat: -23.969420, lng: -46.324180 },
    'embaré': { lat: -23.972150, lng: -46.315200 },
    'embare': { lat: -23.972150, lng: -46.315200 },
    'ponta da praia': { lat: -23.985620, lng: -46.301450 },
    'aparecida': { lat: -23.974890, lng: -46.308940 },
    'macuco': { lat: -23.955400, lng: -46.321850 },
    'estuário': { lat: -23.968940, lng: -46.307520 },
    'estuario': { lat: -23.968940, lng: -46.307520 },
    'vila mathias': { lat: -23.951470, lng: -46.336120 },
    'encruzilhada': { lat: -23.952800, lng: -46.327500 },
    'campo grande': { lat: -23.958430, lng: -46.345890 },
    'marape': { lat: -23.965310, lng: -46.342120 },
    'marapé': { lat: -23.965310, lng: -46.342120 },
    'jose menino': { lat: -23.967890, lng: -46.348920 },
    'josé menino': { lat: -23.967890, lng: -46.348920 },
    'pompeia': { lat: -23.968500, lng: -46.341200 },
    'pompéia': { lat: -23.968500, lng: -46.341200 },
    'centro': { lat: -23.935400, lng: -46.328900 },
    'paqueta': { lat: -23.932820, lng: -46.324150 },
    'paquetá': { lat: -23.932820, lng: -46.324150 },
    'vila nova': { lat: -23.942150, lng: -46.328920 },
    'alemoa': { lat: -23.923810, lng: -46.368420 },
    'chico de paula': { lat: -23.928900, lng: -46.365400 },
    'saboó': { lat: -23.931200, lng: -46.345600 },
    'saboo': { lat: -23.931200, lng: -46.345600 },
    'valongo': { lat: -23.932100, lng: -46.334500 }
  };

  function getCoordsForEmpresa(emp) {
    if (emp.lat && emp.lng && parseFloat(emp.lat) !== 0 && parseFloat(emp.lng) !== 0) {
      return { lat: parseFloat(emp.lat), lng: parseFloat(emp.lng) };
    }

    var bairroKey = (emp.bairro || '').toLowerCase().trim();
    if (bairroKey && santosBairrosCoords[bairroKey]) {
      return santosBairrosCoords[bairroKey];
    }

    for (var k in santosBairrosCoords) {
      if (bairroKey.indexOf(k) !== -1 || (emp.endereco || '').toLowerCase().indexOf(k) !== -1) {
        return santosBairrosCoords[k];
      }
    }

    return { lat: -23.9550, lng: -46.3322 };
  }

  function initLeafletMap(empresas) {
    var mapDiv = document.getElementById('map-canvas');
    if (!mapDiv || typeof window.L === 'undefined') return;

    var points = (empresas && empresas.length > 0) ? empresas : defaultSantosCompanies;

    if (!mapInstance) {
      mapInstance = window.L.map('map-canvas', {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([-23.9550, -46.3322], 13);

      // CartoDB Voyager tiles (Moderno, tons ecológicos e tipografia nítida)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstance);
    } else {
      setTimeout(function () {
        mapInstance.invalidateSize();
      }, 100);
    }

    // Limpa marcadores anteriores para evitar duplicações
    Object.keys(markersMap).forEach(function (k) {
      if (markersMap[k]) mapInstance.removeLayer(markersMap[k]);
    });
    markersMap = {};

    points.forEach(function (emp) {
      var coords = getCoordsForEmpresa(emp);
      var lat = coords.lat;
      var lng = coords.lng;
      var name = emp.razao_social || 'Ponto de Coleta';
      var cat = emp.categoria || 'Reciclagem Geral';
      var enderecoCompleto = emp.endereco || ((emp.logradouro ? emp.logradouro + (emp.numero ? ', ' + emp.numero : '') + ' - ' : '') + (emp.bairro ? emp.bairro + ', ' : '') + (emp.cidade || 'Santos') + ' - ' + (emp.uf || 'SP'));
      var nota = parseFloat(emp.nota_media || 5.0).toFixed(1);
      var icon = emp.icon || (cat.toLowerCase().includes('eletrônico') ? '💻' : (cat.toLowerCase().includes('metal') ? '🥫' : (cat.toLowerCase().includes('óleo') ? '🛢️' : '♻️')));
      var pinType = emp.tipo || (cat.toLowerCase().includes('eletrônico') ? 'reee' : (cat.toLowerCase().includes('metal') ? 'spec' : 'coop'));

      var customIcon = window.L.divIcon({
        className: 'custom-pin-wrapper',
        html: '<div class="custom-pin-marker">' +
                '<div class="pin-pulse"></div>' +
                '<div class="pin-bubble ' + pinType + '">' +
                  '<span class="pin-icon">' + icon + '</span>' +
                '</div>' +
              '</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 36],
        popupAnchor: [0, -36]
      });

      var popupHtml =
        '<div class="map-popup-card">' +
          '<div class="map-popup-header">' +
            '<span class="map-popup-title">' + name + '</span>' +
            '<span class="map-popup-badge">' + (emp.tipo === 'reee' ? 'Eletrônicos' : 'Ponto Exato') + '</span>' +
          '</div>' +
          '<div class="map-popup-bairro">📍 ' + enderecoCompleto + '</div>' +
          '<div class="map-popup-stars">★★★★★ <span style="color:#2b3b30;font-weight:700;">' + nota + '</span> · <span style="color:var(--brand-green-hover);">' + cat + '</span></div>' +
          '<button class="map-popup-btn" onclick="selecionarEmpresaNoModal(\'' + name.replace(/'/g, "\\'") + '\')">' +
            'Solicitar Coleta Aqui ♻️' +
          '</button>' +
        '</div>';

      var marker = window.L.marker([lat, lng], { icon: customIcon })
        .addTo(mapInstance)
        .bindPopup(popupHtml);

      markersMap[emp.id || name] = marker;
    });

    renderMapSidebarList(points);
  }

  function renderMapSidebarList(points) {
    var container = document.getElementById('map-points-list');
    var countEl = document.getElementById('map-total-count');
    if (countEl) countEl.textContent = points.length;
    if (!container) return;

    container.innerHTML = '';

    points.forEach(function (emp) {
      var name = emp.razao_social || 'Ponto de Coleta';
      var cat = emp.categoria || 'Reciclagem';
      var enderecoCompleto = emp.endereco || ((emp.logradouro ? emp.logradouro + (emp.numero ? ', ' + emp.numero : '') + ' - ' : '') + (emp.bairro ? emp.bairro + ', ' : '') + (emp.cidade || 'Santos'));
      var nota = parseFloat(emp.nota_media || 5.0).toFixed(1);
      var icon = emp.icon || (cat.toLowerCase().includes('eletrônico') ? '💻' : (cat.toLowerCase().includes('metal') ? '🥫' : (cat.toLowerCase().includes('óleo') ? '🛢️' : '♻️')));
      var key = emp.id || name;

      var card = document.createElement('div');
      card.className = 'map-point-card';
      card.dataset.id = key;
      card.onclick = function () {
        focarPontoNoMapa(emp);
      };

      card.innerHTML =
        '<h4><span>' + icon + '</span> ' + name + '</h4>' +
        '<p>📍 ' + enderecoCompleto + '</p>' +
        '<div class="map-point-card-meta">' +
          '<span style="color:var(--brand-green-hover);font-weight:600;">' + cat + '</span>' +
          '<span style="color:#f59e0b;font-weight:700;">★ ' + nota + '</span>' +
        '</div>';

      container.appendChild(card);
    });
  }

  function focarPontoNoMapa(emp) {
    if (!mapInstance) return;
    var coords = getCoordsForEmpresa(emp);
    var lat = coords.lat;
    var lng = coords.lng;
    var key = emp.id || emp.razao_social;

    document.querySelectorAll('.map-point-card').forEach(function (c) {
      c.classList.remove('active');
    });
    var activeCard = document.querySelector('.map-point-card[data-id="' + key + '"]');
    if (activeCard) activeCard.classList.add('active');

    mapInstance.flyTo([lat, lng], 16, {
      animate: true,
      duration: 1.2
    });

    var marker = markersMap[key];
    if (marker) {
      setTimeout(function () {
        marker.openPopup();
      }, 500);
    }
  }

  function centralizarMapaEmSantos() {
    if (!mapInstance) return;
    mapInstance.flyTo([-23.9550, -46.3322], 13, {
      animate: true,
      duration: 1.0
    });
    window.toast('🎯 Mapa centralizado na cidade de Santos/SP.');
  }

  function filterMapPointsList() {
    var searchInput = document.getElementById('search-map-points');
    var query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    var points = (cachedEmpresas && cachedEmpresas.length > 0) ? cachedEmpresas : defaultSantosCompanies;
    var filtered = points.filter(function (emp) {
      var name = (emp.razao_social || '').toLowerCase();
      var cat = (emp.categoria || '').toLowerCase();
      var bairro = (emp.bairro || '').toLowerCase();
      return name.includes(query) || cat.includes(query) || bairro.includes(query);
    });

    renderMapSidebarList(filtered);
  }

  function selecionarEmpresaNoModal(empresaNome) {
    openRequestModal();
    var select = document.getElementById('req-empresa');
    if (select) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value.indexOf(empresaNome) !== -1 || empresaNome.indexOf(select.options[i].value) !== -1) {
          select.selectedIndex = i;
          onCompanySelectChange(select.value);
          break;
        }
      }
    }
  }

  /* ==========================================================================
     8. HISTÓRICO DE ATIVIDADES E PONTUAÇÃO (ABA HISTÓRICO)
     ========================================================================== */
  function renderizarHistoricoAtividades(coletas) {
    var list = document.getElementById('tab-historico-list');
    if (!list) return;
    list.innerHTML = '';

    if (!coletas || coletas.length === 0) {
      list.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--text-grey);">Você ainda não possui histórico de atividades. Agende sua primeira coleta para ganhar pontos!</div>';
      return;
    }

    coletas.forEach(function (c) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:1rem 1.2rem;border:1px solid var(--border-light);border-radius:12px;display:flex;justify-content:space-between;align-items:center;background:#fff;';

      var isConcluida = c.status === 'concluido';
      var icon = isConcluida ? '🌱' : (c.status === 'agendado' ? '📅' : (c.status === 'cancelado' ? '✕' : '⏳'));
      var pts = isConcluida ? '+20 pts' : '+0 pts';
      var ptsColor = isConcluida ? 'var(--brand-green-hover)' : 'var(--text-grey)';

      var rawDate = c.data_agendada || '';
      var parts = rawDate.split('-');
      var dateFmt = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : rawDate;
      var orderId = c.protocolo || ('COL-' + strPad(c.id, 6));

      item.innerHTML =
        '<div>' +
          '<strong style="color:var(--text-dark);font-size:0.95rem;">' + icon + ' Coleta ' + (c.status ? c.status.toUpperCase() : 'AGENDADA') + ' — ' + (c.tipo_residuo || 'Recicláveis') + '</strong>' +
          '<div style="font-size:0.8rem;color:var(--text-grey);margin-top:2px;">' + (c.empresa_nome || 'EcoColeta') + ' • ' + (c.peso_estimado_kg || 1) + ' kg • ' + dateFmt + ' • Protocolo ' + orderId + '</div>' +
        '</div>' +
        '<span style="color:' + ptsColor + ';font-weight:700;font-size:0.95rem;">' + pts + '</span>';

      list.appendChild(item);
    });
  }

  /* ==========================================================================
     9. MODAL DE AVALIAÇÃO DE COLETAS CONCLUÍDAS
     ========================================================================== */
  var currentEvalRating = 5;
  var previewEvalRating = null;

  var ratingLabels = {
    1: '1 estrela (Muito Ruim 😞)',
    2: '2 estrelas (Ruim 🙁)',
    3: '3 estrelas (Regular 😐)',
    4: '4 estrelas (Bom 🙂)',
    5: '5 estrelas (Excelente! 🌟)'
  };

  function openEvalModal(coletaId, empresaNome) {
    var overlay = document.getElementById('eval-overlay');
    var modal = document.getElementById('eval-modal');
    var empNameEl = document.getElementById('eval-empresa-name');
    var idInput = document.getElementById('eval-coleta-id');
    var commentInput = document.getElementById('eval-comment');

    if (empNameEl) empNameEl.textContent = 'Empresa: ' + (empresaNome || 'Parceira de Coleta em Santos');
    if (idInput) idInput.value = coletaId;
    if (commentInput) commentInput.value = '';

    setRating(5);

    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');
  }

  function closeEvalModal() {
    var overlay = document.getElementById('eval-overlay');
    var modal = document.getElementById('eval-modal');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
  }

  function setRating(val) {
    currentEvalRating = val;
    previewEvalRating = null;
    atualizarEstrelasDOM(val);
  }

  function previewRating(val) {
    previewEvalRating = val;
    atualizarEstrelasDOM(val);
  }

  function restoreRating() {
    previewEvalRating = null;
    atualizarEstrelasDOM(currentEvalRating);
  }

  function atualizarEstrelasDOM(val) {
    var container = document.getElementById('eval-stars-picker');
    var lbl = document.getElementById('eval-rating-lbl');

    if (lbl) lbl.textContent = ratingLabels[val] || (val + ' estrelas');

    if (container) {
      var spans = container.querySelectorAll('span');
      spans.forEach(function (span, idx) {
        if (idx < val) {
          span.style.color = '#f59e0b';
          span.style.transform = idx === val - 1 ? 'scale(1.2)' : 'scale(1)';
        } else {
          span.style.color = '#d1d5db';
          span.style.transform = 'scale(1)';
        }
        span.style.display = 'inline-block';
        span.style.transition = 'all 0.15s ease';
      });
    }
  }

  function adicionarElogioAoComentario(texto) {
    var commentInput = document.getElementById('eval-comment');
    if (!commentInput) return;
    var atual = commentInput.value.trim();
    if (atual.indexOf(texto) !== -1) return;
    commentInput.value = atual ? (atual + ' · ' + texto) : texto;
    window.toast('✓ Elogio adicionado ao feedback!', 'info', 1500);
  }

  function submitEvaluation() {
    var idInput = document.getElementById('eval-coleta-id');
    var commentInput = document.getElementById('eval-comment');
    var coletaId = idInput ? parseInt(idInput.value, 10) : 0;
    var comment = commentInput ? commentInput.value.trim() : '';

    if (coletaId <= 0) {
      window.toast('⚠ Coleta inválida para avaliação.', 'warning');
      return;
    }

    window.toast('⏳ Enviando sua avaliação...');

    window.apiFetch('api/avaliacoes/create.php', {
      method: 'POST',
      body: {
        coleta_id: coletaId,
        nota: currentEvalRating,
        comentario: comment
      }
    }).then(function (res) {
      if (res && res.success) {
        window.toast('🎉 Avaliação enviada com sucesso! Você ganhou +10 Ecopontos!', 'success', 4500);
        closeEvalModal();

        // Atualiza a coleta no cache local
        if (Array.isArray(cachedColetas)) {
          var target = cachedColetas.find(function (c) { return c.id === coletaId; });
          if (target) {
            target.avaliacao_id = res.avaliacao_id || 1;
            target.avaliacao_nota = currentEvalRating;
            target.avaliacao_comentario = comment;
          }
        }

        if (window.syncUserProfile) window.syncUserProfile();
        carregarPainelUsuario();
      } else {
        window.toast('⚠ ' + (res.error || 'Não foi possível enviar a avaliação.'), 'warning');
      }
    }).catch(function (err) {
      console.error('Erro no envio de avaliação:', err);
      window.toast('⚠ Falha na comunicação com o servidor.', 'error');
    });
  }

  /* ==========================================================================
     10. MODAL DE SOLICITAÇÃO DE COLETA & MATERIAIS ACEITOS
     ========================================================================== */
  function getAcceptedMaterialsForCategory(cat) {
    cat = (cat || '').toLowerCase();
    if (cat.includes('eletrônic') || cat.includes('reee')) {
      return ['Eletrônicos', 'Metal'];
    }
    if (cat.includes('óleo') || cat.includes('cozinha')) {
      return ['Óleo de Cozinha', 'Plástico', 'Papel'];
    }
    if (cat.includes('sucata') || cat.includes('metais')) {
      return ['Metal', 'Plástico', 'Eletrônicos'];
    }
    if (cat.includes('vidro') || cat.includes('papelão')) {
      return ['Vidro', 'Papel', 'Plástico'];
    }
    return ['Plástico', 'Papel', 'Metal', 'Vidro', 'Eletrônicos', 'Óleo de Cozinha'];
  }

  function renderMaterialChips(acceptedList) {
    var container = document.getElementById('req-materials-container');
    if (!container) return;
    container.innerHTML = '';

    todosMateriais.forEach(function (mat) {
      var isAccepted = acceptedList.indexOf(mat.name) !== -1;
      var chip = document.createElement('div');
      chip.className = 'mat-chip' + (isAccepted ? ' active' : ' disabled');
      chip.dataset.material = mat.name;
      chip.dataset.accepted = isAccepted ? 'true' : 'false';

      chip.innerHTML =
        '<span style="font-size:0.95rem;">' + mat.icon + '</span>' +
        '<span>' + mat.name + '</span>' +
        '<span style="font-size:0.75rem;">' + (isAccepted ? '✓' : '✕') + '</span>';

      if (isAccepted) {
        chip.addEventListener('click', function () {
          this.classList.toggle('active');
        });
      }

      container.appendChild(chip);
    });
  }

  function onCompanySelectChange(companyName) {
    var emp = empresasMateriaisMap[companyName];
    var statusEl = document.getElementById('req-company-status');

    if (emp) {
      var accepted = getAcceptedMaterialsForCategory(emp.categoria);
      renderMaterialChips(accepted);
      if (statusEl) statusEl.textContent = 'Aceita ' + accepted.length + ' tipos de resíduos em ' + (emp.bairro || 'Santos');
    } else {
      renderMaterialChips(['Plástico', 'Papel', 'Metal', 'Vidro']);
      if (statusEl) statusEl.textContent = 'Materiais padrão para coleta residencial';
    }
  }

  function popularSelectComEmpresas(empresas) {
    var empSelect = document.getElementById('req-empresa');
    if (!empSelect) return;

    var currentVal = empSelect.value;
    empSelect.innerHTML = '';
    empresasMateriaisMap = {};

    empresas.forEach(function (emp) {
      var name = emp.razao_social || 'Empresa Parceira';
      var loc = emp.bairro || emp.cidade || 'Santos';
      empresasMateriaisMap[name] = emp;

      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + ' (' + loc + ' — ' + (emp.categoria || 'Reciclagem') + ')';
      if (name === currentVal) opt.selected = true;
      empSelect.appendChild(opt);
    });

    if (!empSelect.value && empSelect.options.length > 0) {
      empSelect.selectedIndex = 0;
    }

    onCompanySelectChange(empSelect.value);
  }

  function carregarEmpresasNoSelect() {
    var empSelect = document.getElementById('req-empresa');
    if (!empSelect) return;

    if (empSelect.options.length === 0) {
      popularSelectComEmpresas(cachedEmpresas.length > 0 ? cachedEmpresas : defaultSantosCompanies);
    } else {
      onCompanySelectChange(empSelect.value);
    }
  }

  var userRegisteredAddress = null;
  var isCustomAddressMode = false;

  function ehEnderecoDeSantos(addr) {
    if (!addr) return false;
    var cidade = (addr.cidade || '').trim().toLowerCase();
    var uf = (addr.uf || '').trim().toUpperCase();
    var cep = (addr.cep || '').replace(/\D/g, '');
    var endereco = (addr.endereco || '').toLowerCase();

    if (cep.length === 8 && cep.startsWith('110')) return true;
    if (cidade === 'santos' && (uf === 'SP' || uf === '')) return true;
    if (endereco.includes('santos') && (uf === 'SP' || uf === '')) return true;
    if (!cidade && (addr.logradouro || addr.bairro) && (uf === 'SP' || !uf)) return true;
    return false;
  }

  function obterDadosEnderecoUsuario() {
    try {
      var stored = sessionStorage.getItem('ecocall_user');
      if (stored) {
        var u = JSON.parse(stored);
        return {
          cep: u.cep || '',
          tipo_logradouro: u.tipo_logradouro || 'Rua',
          logradouro: u.logradouro || '',
          numero: u.numero || '',
          complemento: u.complemento || '',
          bairro: u.bairro || '',
          cidade: u.cidade || 'Santos',
          uf: u.uf || 'SP',
          endereco: u.endereco || ''
        };
      }
    } catch(e) {}
    return null;
  }

  function preencherInputsEndereco(addr) {
    if (!addr) return;
    if (addr.cep !== undefined) setVal('req-cep', addr.cep);
    if (addr.tipo_logradouro !== undefined) setVal('req-tipo-logradouro', addr.tipo_logradouro || 'Rua');
    if (addr.logradouro !== undefined) setVal('req-logradouro', addr.logradouro);
    if (addr.numero !== undefined) setVal('req-numero', addr.numero);
    if (addr.complemento !== undefined) setVal('req-complemento', addr.complemento);
    if (addr.bairro !== undefined) setVal('req-bairro', addr.bairro);
    setVal('req-cidade', 'Santos');
    setVal('req-uf', 'SP');
  }

  function formatarEnderecoLegivel(addr) {
    if (!addr || (!addr.logradouro && !addr.cep && !addr.bairro)) {
      return 'Nenhum endereço residencial cadastrado. Preencha no modo "Outros".';
    }
    var tipo = addr.tipo_logradouro ? addr.tipo_logradouro + ' ' : '';
    var log = addr.logradouro ? (addr.logradouro.toLowerCase().startsWith(tipo.trim().toLowerCase()) ? addr.logradouro : tipo + addr.logradouro) : 'Endereço sem logradouro';
    var num = addr.numero ? ', ' + addr.numero : ', S/N';
    var comp = addr.complemento ? ' (' + addr.complemento + ')' : '';
    var bai = addr.bairro ? ' - ' + addr.bairro : '';
    var cid = addr.cidade ? ', ' + addr.cidade : ', Santos';
    var uf = addr.uf ? '/' + addr.uf : '/SP';
    var cep = addr.cep ? ' — CEP: ' + addr.cep : '';
    return log + num + comp + bai + cid + uf + cep;
  }

  function atualizarVisualizacaoEnderecoModal() {
    var tabResidencial = document.getElementById('btn-tab-addr-residencial');
    var tabOutros = document.getElementById('btn-tab-addr-outros');
    var regCard = document.getElementById('req-addr-registered-card');
    var customForm = document.getElementById('req-addr-custom-form');
    var badge = document.getElementById('req-addr-status-badge');
    var previewText = document.getElementById('req-addr-preview-text');
    var alertForaSantos = document.getElementById('req-addr-fora-santos-alert');
    var cidadeOrigemSpan = document.getElementById('req-addr-cidade-origem');

    userRegisteredAddress = obterDadosEnderecoUsuario();
    var temEnderecoCadastrado = userRegisteredAddress && (userRegisteredAddress.logradouro || userRegisteredAddress.cep || userRegisteredAddress.bairro);
    var ehDeSantos = ehEnderecoDeSantos(userRegisteredAddress);

    if (previewText && userRegisteredAddress) {
      previewText.textContent = formatarEnderecoLegivel(userRegisteredAddress);
    }

    if (!ehDeSantos && temEnderecoCadastrado) {
      if (alertForaSantos) alertForaSantos.style.display = 'flex';
      if (cidadeOrigemSpan) {
        var cidNome = userRegisteredAddress.cidade || 'Outro Município';
        var ufNome = userRegisteredAddress.uf ? '/' + userRegisteredAddress.uf : '';
        cidadeOrigemSpan.textContent = cidNome + ufNome;
      }
      if (tabResidencial) {
        tabResidencial.classList.add('disabled-tab');
        tabResidencial.title = 'Endereço residencial fora de Santos/SP';
      }
    } else {
      if (alertForaSantos) alertForaSantos.style.display = 'none';
      if (tabResidencial) {
        tabResidencial.classList.remove('disabled-tab');
        tabResidencial.title = '';
      }
    }

    if (isCustomAddressMode || !temEnderecoCadastrado || !ehDeSantos) {
      if (tabResidencial) tabResidencial.classList.remove('active');
      if (tabOutros) tabOutros.classList.add('active');
      if (regCard) regCard.style.display = 'none';
      if (customForm) customForm.style.display = 'block';
      if (badge) {
        badge.textContent = '📍 Outro Endereço (Santos/SP)';
        badge.className = 'req-addr-badge badge-custom';
      }
    } else {
      if (tabResidencial) tabResidencial.classList.add('active');
      if (tabOutros) tabOutros.classList.remove('active');
      if (regCard) regCard.style.display = 'block';
      if (customForm) customForm.style.display = 'none';
      if (badge) {
        badge.textContent = '✓ Endereço Residencial (Santos)';
        badge.className = 'req-addr-badge badge-default';
      }
      preencherInputsEndereco(userRegisteredAddress);
    }
  }

  function selecionarTipoEndereco(tipo) {
    userRegisteredAddress = obterDadosEnderecoUsuario();
    var ehDeSantos = ehEnderecoDeSantos(userRegisteredAddress);

    if (tipo === 'residencial') {
      if (!userRegisteredAddress || (!userRegisteredAddress.logradouro && !userRegisteredAddress.cep)) {
        window.toast('⚠ Você ainda não possui endereço residencial cadastrado. Preencha abaixo.');
        selecionarTipoEndereco('outros');
        return;
      }
      if (!ehDeSantos) {
        var cidNome = userRegisteredAddress.cidade || 'outra cidade';
        var ufNome = userRegisteredAddress.uf ? '/' + userRegisteredAddress.uf : '';
        window.toast('❌ O EcoCall opera em Santos/SP. Como seu endereço cadastrado é em ' + cidNome + ufNome + ', informe um endereço em Santos no modo "Outros".');
        selecionarTipoEndereco('outros');
        return;
      }
      isCustomAddressMode = false;
      preencherInputsEndereco(userRegisteredAddress);
      atualizarVisualizacaoEnderecoModal();
      window.toast('🏠 Endereço residencial de Santos selecionado.');
    } else {
      isCustomAddressMode = true;
      atualizarVisualizacaoEnderecoModal();
      var cepInput = document.getElementById('req-cep');
      if (cepInput) cepInput.focus();
      window.toast('📍 Modo "Outros" selecionado. Informe o endereço em Santos.');
    }
  }

  function openRequestModal() {
    var overlay = document.getElementById('req-overlay');
    var modal = document.getElementById('request-modal');
    var dateInput = document.getElementById('req-date');

    if (dateInput) {
      var todayStr = new Date().toISOString().split('T')[0];
      dateInput.min = todayStr;
      if (!dateInput.value || dateInput.value < todayStr) {
        var nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        dateInput.value = nextDate.toISOString().split('T')[0];
      }
    }

    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');

    carregarEmpresasNoSelect();

    function aplicarDadosEnderecoModal() {
      userRegisteredAddress = obterDadosEnderecoUsuario();
      var temEndereco = userRegisteredAddress && (userRegisteredAddress.logradouro || userRegisteredAddress.cep || userRegisteredAddress.bairro);
      var ehDeSantos = ehEnderecoDeSantos(userRegisteredAddress);

      if (!temEndereco || !ehDeSantos) {
        isCustomAddressMode = true;
        setVal('req-uf', 'SP');
        setVal('req-cidade', 'Santos');
      } else {
        isCustomAddressMode = false;
        preencherInputsEndereco(userRegisteredAddress);
      }
      atualizarVisualizacaoEnderecoModal();
    }

    aplicarDadosEnderecoModal();

    if (window.apiFetch) {
      window.apiFetch('api/auth/me.php').then(function (res) {
        if (res && res.authenticated && res.user) {
          try { sessionStorage.setItem('ecocall_user', JSON.stringify(res.user)); } catch(e) {}
          aplicarDadosEnderecoModal();
        }
      }).catch(function() {});
    }
  }

  function closeRequestModal() {
    var overlay = document.getElementById('req-overlay');
    var modal = document.getElementById('request-modal');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
  }

  /* ==========================================================================
     11. BUSCA DE CEP VIA VIACEP COM VALIDAÇÃO SANTOS/SP
     ========================================================================== */
  function maskReqCEP(input) {
    var v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5);
    input.value = v;
  }

  function buscarCEPReq() {
    var cepInput = document.getElementById('req-cep');
    if (!cepInput) return;
    var cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) return;

    if (!cep.startsWith('110')) {
      window.toast('❌ Atendimento exclusivo em Santos/SP! O CEP deve começar com "110" (faixa 11000 a 11099).');
      setVal('req-cep', '');
      setVal('req-logradouro', '');
      setVal('req-bairro', '');
      setVal('req-numero', '');
      setVal('req-complemento', '');
      if (cepInput) cepInput.focus();
      return;
    }

    window.toast('🔍 Consultando CEP de Santos...');

    fetch('https://viacep.com.br/ws/' + cep + '/json/')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.erro) {
          window.toast('❌ CEP não encontrado. Verifique o número digitado.');
          return;
        }

        var localidade = (data.localidade || '').trim().toLowerCase();
        var uf = (data.uf || '').trim().toUpperCase();

        if (localidade !== 'santos' || uf !== 'SP') {
          window.toast('❌ Atendimento exclusivo em Santos/SP! O CEP informado pertence a ' + data.localidade + '/' + data.uf + '.');
          setVal('req-cep', '');
          if (cepInput) cepInput.focus();
          return;
        }

        setVal('req-logradouro', data.logradouro);
        setVal('req-bairro', data.bairro);
        setVal('req-uf', 'SP');
        setVal('req-cidade', 'Santos');

        var numInput = document.getElementById('req-numero');
        if (numInput) numInput.focus();

        window.toast('✅ Endereço em Santos/SP identificado!');
      })
      .catch(function () {
        window.toast('⚠ Falha ao consultar o CEP.');
      });
  }

  function buscarCEPPerfil() {
    var cepInput = document.getElementById('usr-input-cep');
    if (!cepInput) return;
    var cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) return;

    window.toast('🔍 Buscando endereço pelo CEP...');

    fetch('https://viacep.com.br/ws/' + cep + '/json/')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && !data.erro) {
          setVal('usr-input-logradouro', data.logradouro);
          setVal('usr-input-bairro', data.bairro);
          setVal('usr-input-cidade', data.localidade);
          setVal('usr-input-uf', data.uf);
          window.toast('✅ Endereço preenchido automaticamente!');
          var num = document.getElementById('usr-input-numero');
          if (num) num.focus();
        }
      })
      .catch(function() {});
  }

  /* ==========================================================================
     12. ENVIO DE NOVA SOLICITAÇÃO (POST MYSQL)
     ========================================================================== */
  function submitCollectionRequest() {
    var companySelect = document.getElementById('req-empresa');
    var companyName = companySelect ? companySelect.value : 'Terra Santos Ambiental (Consórcio Público)';

    var emp = empresasMateriaisMap[companyName] || { id: null };

    var activeChips = document.querySelectorAll('#req-materials-container .mat-chip.active');
    var selectedMaterials = [];
    activeChips.forEach(function (chip) {
      if (chip.dataset.accepted === 'true') {
        selectedMaterials.push(chip.dataset.material);
      }
    });

    if (selectedMaterials.length === 0) {
      window.toast('⚠ Selecione pelo menos 1 tipo de material para a coleta.');
      return;
    }

    var weightInput = document.getElementById('req-weight');
    var weight = weightInput && weightInput.value ? parseFloat(weightInput.value) : 2.5;

    var turnoInput = document.getElementById('req-turno');
    var turno = turnoInput ? turnoInput.value : 'Manhã (08h - 12h)';

    var cep = (document.getElementById('req-cep') || {}).value || '';
    var tipoLog = (document.getElementById('req-tipo-logradouro') || {}).value || 'Rua';
    var logradouro = (document.getElementById('req-logradouro') || {}).value || '';
    var numero = (document.getElementById('req-numero') || {}).value || '';
    var complemento = (document.getElementById('req-complemento') || {}).value || '';
    var bairro = (document.getElementById('req-bairro') || {}).value || '';

    if (!isCustomAddressMode && !ehEnderecoDeSantos(userRegisteredAddress)) {
      window.toast('❌ Seu endereço residencial não é de Santos/SP. Use o modo "Outros".');
      selecionarTipoEndereco('outros');
      return;
    }

    if (isCustomAddressMode) {
      var cleanCep = cep.replace(/\D/g, '');
      if (!cleanCep || cleanCep.length !== 8 || !cleanCep.startsWith('110')) {
        window.toast('❌ O CEP informado no modo "Outros" deve ser de Santos (faixa 11000 a 11099).');
        var cepInput = document.getElementById('req-cep');
        if (cepInput) cepInput.focus();
        return;
      }
    }

    if (!logradouro || !numero || !bairro) {
      window.toast('⚠ Preencha os campos obrigatórios do endereço de retirada em Santos.');
      return;
    }

    var prefixoLog = logradouro.toLowerCase().startsWith(tipoLog.toLowerCase()) ? '' : (tipoLog + ' ');
    var logradouroCompleto = prefixoLog + logradouro;
    var compPart = complemento ? ' (' + complemento + ')' : '';
    var cepPart = cep ? ' (CEP: ' + cep + ')' : '';
    var fullAddress = logradouroCompleto + ', ' + numero + compPart + ' - ' + bairro + ', Santos/SP' + cepPart;

    var dateInput = document.getElementById('req-date');
    var rawDate = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
    var notes = (document.getElementById('req-notes') || {}).value || '';

    var payload = {
      empresa_id: emp.id,
      empresa_nome: companyName,
      tipo_residuo: selectedMaterials.join(', '),
      peso_estimado_kg: weight,
      data_agendada: rawDate,
      turno: turno,
      endereco_coleta: fullAddress,
      observacoes: notes
    };

    var submitBtn = document.querySelector('.btn-submit-modal');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Agendando...';
    }

    window.toast('⏳ Enviando solicitação de coleta...');

    if (window.apiFetch) {
      window.apiFetch('api/coletas/create.php', {
        method: 'POST',
        body: payload
      }).then(function (res) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirmar Solicitação →';
        }

        if (res && res.success) {
          window.toast('🎉 ' + (res.message || 'Solicitação agendada com sucesso! Protocolo: ' + res.protocolo));
          closeRequestModal();
          carregarPainelUsuario();
          if (res.protocolo && window.imprimirComprovantePDF) {
            window.imprimirComprovantePDF(res.protocolo, true);
          }
        } else {
          window.toast('❌ ' + (res.error || 'Erro ao agendar coleta.'));
        }
      }).catch(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirmar Solicitação →';
        }
        window.toast('❌ Erro de conexão ao enviar solicitação.');
      });
    }
  }

  /* ==========================================================================
     13. GERENCIAMENTO DE PERFIL DO USUÁRIO
     ========================================================================== */
  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  }

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function carregarPerfilUsuario() {
    if (!window.apiFetch) return;

    window.apiFetch('api/auth/me.php').then(function (res) {
      if (!res || !res.authenticated || !res.user) return;

      var u = res.user;
      var name = u.nome || 'Usuário';
      var email = u.email || '';
      var initials = name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase() || 'EC';
      var memberSince = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Mai/2024';

      var cardAvatar = document.getElementById('usr-card-avatar');
      var cardName = document.getElementById('usr-card-name');
      var cardEmail = document.getElementById('usr-card-email');
      var statPontos = document.getElementById('usr-stat-pontos');
      var statMembro = document.getElementById('usr-stat-membro');

      if (cardAvatar) {
        if (u.avatar_url) {
          cardAvatar.innerHTML = '<img src="' + u.avatar_url + '?v=' + Date.now() + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">';
        } else {
          cardAvatar.textContent = initials;
        }
      }
      if (cardName) cardName.textContent = name;
      if (cardEmail) cardEmail.textContent = email;
      if (statPontos) statPontos.textContent = (u.pontos || 0) + ' pts';
      if (statMembro) statMembro.textContent = memberSince;

      atualizarBotaoRemoverAvatar(u.avatar_url);

      setVal('usr-input-nome', u.nome);
      setVal('usr-input-cpf', u.cpf);
      setVal('usr-input-email', u.email);
      setVal('usr-input-telefone', u.telefone);
      setVal('usr-input-cep', u.cep);
      setVal('usr-input-cidade', u.cidade || 'Santos');
      setVal('usr-input-uf', u.uf || 'SP');
      setVal('usr-input-logradouro', u.logradouro);
      setVal('usr-input-numero', u.numero);
      setVal('usr-input-bairro', u.bairro);
      setVal('usr-input-complemento', u.complemento);

      setVal('usr-input-senha', '');
      setVal('usr-input-senha-conf', '');
    }).catch(function (err) {
      console.warn('Erro ao carregar perfil:', err);
    });
  }

  function uploadAvatarUsuario(input) {
    if (!input || !input.files || input.files.length === 0) return;
    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      window.toast('❌ A imagem selecionada ultrapassa o limite de 5MB.');
      input.value = '';
      return;
    }

    var formData = new FormData();
    formData.append('avatar', file);

    window.toast('⏳ Enviando foto de perfil...');

    fetch('api/auth/upload_avatar.php', {
      method: 'POST',
      body: formData
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      input.value = '';
      if (data && data.success) {
        window.toast('✓ ' + (data.message || 'Foto de perfil atualizada!'));
        try {
          var u = JSON.parse(sessionStorage.getItem('ecocall_user') || '{}');
          u.avatar_url = data.avatar_url;
          sessionStorage.setItem('ecocall_user', JSON.stringify(u));
        } catch(e) {}

        if (window.syncUserProfile) {
          window.syncUserProfile();
        }
        carregarPerfilUsuario();
      } else {
        window.toast('⚠ ' + (data.error || 'Falha ao atualizar foto.'));
      }
    })
    .catch(function (err) {
      input.value = '';
      console.error('Erro no upload de avatar:', err);
      window.toast('⚠ Falha na comunicação com o servidor.');
    });
  }

  function removerAvatarUsuario() {
    if (!confirm('Deseja remover sua foto de perfil e voltar às iniciais?')) return;
    window.toast('⏳ Removendo foto de perfil...');

    fetch('api/auth/upload_avatar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remover' })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.success) {
        window.toast('✓ Foto de perfil removida.');
        try {
          var u = JSON.parse(sessionStorage.getItem('ecocall_user') || '{}');
          u.avatar_url = null;
          sessionStorage.setItem('ecocall_user', JSON.stringify(u));
        } catch(e) {}

        if (window.syncUserProfile) {
          window.syncUserProfile();
        }
        carregarPerfilUsuario();
      } else {
        window.toast('⚠ ' + (data.error || 'Falha ao remover foto.'));
      }
    });
  }

  function atualizarBotaoRemoverAvatar(avatarUrl) {
    var btn = document.getElementById('btn-remover-avatar');
    if (btn) {
      btn.style.display = avatarUrl ? 'inline-block' : 'none';
    }
  }

  function salvarPerfilUsuario(e) {
    if (e && e.preventDefault) e.preventDefault();

    var senha = getVal('usr-input-senha');
    var senhaConf = getVal('usr-input-senha-conf');

    if (senha !== '' || senhaConf !== '') {
      if (senha.length < 6) {
        window.toast('⚠ A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (senha !== senhaConf) {
        window.toast('⚠ A nova senha e a confirmação não coincidem.');
        return;
      }
    }

    var btnSave = document.getElementById('usr-btn-save');
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'Salvando...';
    }

    var payload = {
      nome: getVal('usr-input-nome'),
      email: getVal('usr-input-email'),
      cpf: getVal('usr-input-cpf'),
      telefone: getVal('usr-input-telefone'),
      cep: getVal('usr-input-cep'),
      cidade: getVal('usr-input-cidade'),
      uf: getVal('usr-input-uf'),
      logradouro: getVal('usr-input-logradouro'),
      numero: getVal('usr-input-numero'),
      bairro: getVal('usr-input-bairro'),
      complemento: getVal('usr-input-complemento'),
      senha: senha
    };

    window.apiFetch('api/auth/update_profile.php', {
      method: 'POST',
      body: payload
    }).then(function (res) {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'Salvar alterações';
      }
      if (res && res.success) {
        window.toast('✓ ' + (res.message || 'Perfil atualizado com sucesso!'));
        if (window.syncUserProfile) window.syncUserProfile();
        carregarPerfilUsuario();
      } else {
        window.toast('⚠ ' + (res.error || 'Falha ao atualizar perfil.'));
      }
    }).catch(function (err) {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'Salvar alterações';
      }
      console.error('Erro na gravação do perfil:', err);
      window.toast('⚠ Falha na comunicação com o servidor.');
    });
  }

  function excluirMinhaContaUsuario() {
    var confirm1 = confirm('⚠️ ATENÇÃO: Esta ação é definitiva e não poderá ser desfeita.\n\nTem certeza absoluta de que deseja excluir permanentemente seu cadastro, histórico de coletas e saldo de pontos da plataforma EcoCall?');
    if (!confirm1) return;

    var confirm2 = prompt('Digite "EXCLUIR" em letras maiúsculas para confirmar a exclusão definitiva:');
    if (confirm2 !== 'EXCLUIR') {
      window.toast('ℹ️ Operação de exclusão cancelada.');
      return;
    }

    window.toast('⏳ Excluindo seu cadastro...');

    if (window.apiFetch) {
      window.apiFetch('api/auth/delete_account.php', {
        method: 'POST'
      }).then(function (res) {
        if (res && res.success) {
          try { sessionStorage.removeItem('ecocall_user'); } catch (e) {}
          window.toast('✓ ' + (res.message || 'Cadastro excluído com sucesso. Redirecionando...'));
          setTimeout(function () {
            window.location.replace('ecocall-home.html');
          }, 1200);
        } else {
          window.toast('❌ ' + (res.error || 'Não foi possível excluir o cadastro.'));
        }
      }).catch(function (err) {
        console.error('Erro ao excluir conta:', err);
        window.toast('❌ Falha na comunicação com o servidor.');
      });
    }
  }

  /* ==========================================================================
     14. INICIALIZAÇÃO DO SCRIPT
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    carregarPainelUsuario();
  });

  window.carregarPainelUsuario = carregarPainelUsuario;
  window.switchUserTab = switchUserTab;
  window.carregarColetasDoBanco = carregarColetasDoBanco;
  window.carregarPerfilUsuario = carregarPerfilUsuario;
  window.salvarPerfilUsuario = salvarPerfilUsuario;
  window.uploadAvatarUsuario = uploadAvatarUsuario;
  window.removerAvatarUsuario = removerAvatarUsuario;
  window.excluirMinhaContaUsuario = excluirMinhaContaUsuario;
  window.setColetasFilter = setColetasFilter;
  window.filterColetasRows = filterColetasRows;
  window.filterEmpresasList = filterEmpresasList;
  window.toggleColetasView = toggleColetasView;
  window.openDetailModal = openDetailModal;
  window.closeDetail = closeDetail;
  window.cancelarMinhaColeta = cancelarMinhaColeta;
  window.openRequestModal = openRequestModal;
  window.closeRequestModal = closeRequestModal;
  window.onCompanySelectChange = onCompanySelectChange;
  window.carregarEmpresasNoSelect = carregarEmpresasNoSelect;
  window.submitCollectionRequest = submitCollectionRequest;
  window.maskReqCEP = maskReqCEP;
  window.buscarCEPReq = buscarCEPReq;
  window.buscarCEPPerfil = buscarCEPPerfil;
  window.initLeafletMap = initLeafletMap;
  window.centralizarMapaEmSantos = centralizarMapaEmSantos;
  window.focarPontoNoMapa = focarPontoNoMapa;
  window.filterMapPointsList = filterMapPointsList;
  window.selecionarEmpresaNoModal = selecionarEmpresaNoModal;
  window.renderizarHistoricoAtividades = renderizarHistoricoAtividades;
  window.openEvalModal = openEvalModal;
  window.closeEvalModal = closeEvalModal;
  window.setRating = setRating;
  window.submitEvaluation = submitEvaluation;
  window.selecionarTipoEndereco = selecionarTipoEndereco;
})();
