/* ==========================================================================
   EcoCall — Painel Corporativo da Empresa (SPA Unificado e JavaScript Dedicado)
   Controla a navegação SPA entre todas as abas (Painel, Pedidos, Agendamentos,
   Relatórios, Perfil e Avaliações), estatísticas corporativas, filtros, ações de coletas e perfil.
   ========================================================================== */
(function () {
  'use strict';

  var activeOrdersFilter = 'all';
  var cachedColetas = [];
  var cachedStats = null;
  var cachedAvaliacoes = [];
  var calCurrentDate = new Date();
  var calSelectedDateStr = '';

  var escapeHtml = window.escapeHtml || function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };

  /* ==========================================================================
     1. CONTROLE DE NAVEGAÇÃO POR ABAS CORPORATIVAS (SPA)
     ========================================================================== */
  function switchEmpresaTab(tabName, el) {
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

    var tabs = document.querySelectorAll('.emp-tab-content');
    tabs.forEach(function (t) {
      t.style.display = 'none';
    });

    var activeTab = document.getElementById('emp-tab-' + tabName);
    if (activeTab) {
      activeTab.style.display = 'block';
    }

    var titleEl = document.getElementById('emp-topbar-title');
    var subEl = document.getElementById('emp-topbar-sub');

    var titlesMap = {
      dash: { title: 'Painel da Empresa 🏢', sub: 'Gerencie requisições e controle a operação de coleta na sua região.' },
      pedidos: { title: 'Pedidos de Coleta 📑', sub: 'Aceite, recuse ou acompanhe as solicitações de coleta recebidas.' },
      agendamentos: { title: 'Agenda de Coletas 📅', sub: 'Veja as coletas marcadas e organize a rota da equipe.' },
      relatorios: { title: 'Relatórios & Estatísticas 📈', sub: 'Acompanhe a evolução da sua operação de coleta e métricas ambientais.' },
      perfil: { title: 'Meu Perfil Corporativo 👤', sub: 'Mantenha os dados cadastrais da empresa e credenciais sempre atualizados.' },
      avaliacoes: { title: 'Avaliações de Clientes ⭐', sub: 'Veja o que os cidadãos dizem sobre o atendimento da sua empresa.' }
    };

    var info = titlesMap[tabName] || titlesMap['dash'];
    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.sub;

    if (tabName === 'perfil') {
      carregarPerfilEmpresa();
    } else if (tabName === 'dash') {
      carregarPainelEmpresa();
    } else if (tabName === 'pedidos') {
      carregarColetasEmpresa();
    } else if (tabName === 'agendamentos') {
      renderizarCalendario(cachedColetas);
    } else if (tabName === 'relatorios') {
      carregarEstatisticasEmpresa();
    } else if (tabName === 'avaliacoes') {
      carregarAvaliacoesEmpresa();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ==========================================================================
     2. CARREGAMENTO GERAL DE DADOS DO BANCO MYSQL
     ========================================================================== */
  function carregarPainelEmpresa() {
    if (!window.apiFetch) return;

    if (window.syncUserProfile) {
      window.syncUserProfile();
    }

    carregarEstatisticasEmpresa();
    carregarColetasEmpresa();
    carregarAvaliacoesEmpresa();
  }

  function carregarEstatisticasEmpresa() {
    if (!window.apiFetch) return;

    window.apiFetch('api/dashboard/stats.php').then(function (res) {
      if (res && res.success && res.stats) {
        cachedStats = res.stats;
        var st = res.stats;

        // Visão Geral
        var elNovos = document.getElementById('emp-stat-novos');
        var elConcluidas = document.getElementById('emp-stat-concluidas');
        var elNota = document.getElementById('emp-stat-nota');
        var elPeso = document.getElementById('emp-stat-peso');
        var badgePedidos = document.getElementById('emp-badge-pedidos');

        var pendentes = st.pedidos_pendentes || 0;
        if (elNovos) elNovos.textContent = String(pendentes).padStart(2, '0');
        if (elConcluidas) elConcluidas.textContent = st.coletas_concluidas || 0;
        if (elNota) elNota.innerHTML = (st.nota_media || 5.0).toFixed(1) + ' <span class="m-unit">★</span>';
        if (elPeso) elPeso.innerHTML = (st.peso_total_kg || 0) + ' <span class="m-unit">kg</span>';
        if (badgePedidos) badgePedidos.textContent = pendentes;

        // Relatórios
        var relMassa = document.getElementById('rel-massa-val');
        var relConcluidas = document.getElementById('rel-concluidas-val');
        var relCo2 = document.getElementById('rel-co2-val');

        if (relMassa) relMassa.innerHTML = (st.peso_total_kg || 0) + ' <span style="font-size:1rem;color:var(--text-grey);">kg</span>';
        if (relConcluidas) relConcluidas.textContent = st.coletas_concluidas || 0;
        if (relCo2) relCo2.innerHTML = (st.co2_economizado_kg || 0) + ' <span style="font-size:1rem;color:var(--text-grey);">kg</span>';

        // Top Clientes
        renderizarTopClientes(st.top_clientes || []);
      }
    }).catch(function (err) {
      console.warn('Erro ao carregar estatísticas da empresa:', err);
    });
  }

  function carregarColetasEmpresa() {
    if (!window.apiFetch) return;

    window.apiFetch('api/coletas/index.php').then(function (res) {
      if (res && res.success && Array.isArray(res.coletas)) {
        cachedColetas = res.coletas;
        renderizarTabelaDash(res.coletas);
        renderizarMiniGraficoDash(res.coletas);
        renderizarTabelaPedidos(res.coletas);
        renderizarCalendario(res.coletas);
        renderizarGraficosRelatorio(res.coletas);
      }
    }).catch(function (err) {
      console.warn('Erro ao carregar coletas da empresa:', err);
    });
  }

  function renderizarMiniGraficoDash(coletas) {
    var barsWrap = document.getElementById('emp-dash-chart-bars');
    var labelsWrap = document.getElementById('emp-dash-chart-labels');
    if (!barsWrap || !labelsWrap) return;

    var mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var hoje = new Date();
    var ultimos6 = [];

    for (var i = 5; i >= 0; i--) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      ultimos6.push({
        ano: d.getFullYear(),
        mes: d.getMonth(),
        label: i === 0 ? 'Atual' : mesesNomes[d.getMonth()],
        total: 0
      });
    }

    (coletas || []).forEach(function (c) {
      var rawDate = c.data_agendada;
      if (rawDate) {
        var cDate = new Date(rawDate + 'T00:00:00');
        ultimos6.forEach(function (mObj) {
          if (cDate.getFullYear() === mObj.ano && cDate.getMonth() === mObj.mes) {
            mObj.total++;
          }
        });
      }
    });

    var maxVal = Math.max.apply(null, ultimos6.map(function(m){return m.total;})) || 1;

    barsWrap.innerHTML = '';
    labelsWrap.innerHTML = '';

    ultimos6.forEach(function (m, idx) {
      var isCurrent = idx === ultimos6.length - 1;
      var pct = Math.max(18, Math.round((m.total / maxVal) * 90));
      if (m.total === 0) pct = 15;

      var bar = document.createElement('div');
      bar.className = 'chart-bar ' + (isCurrent ? 'bar-current' : 'bar-past');
      bar.style.height = pct + '%';
      bar.setAttribute('data-val', m.total + (m.total === 1 ? ' coleta' : ' coletas'));
      bar.title = m.label + ': ' + m.total + ' coletas';
      barsWrap.appendChild(bar);

      var span = document.createElement('span');
      span.textContent = m.label;
      if (isCurrent) span.style.color = '#15803d';
      labelsWrap.appendChild(span);
    });
  }

  /* ==========================================================================
     3. RENDERIZAÇÃO DA TABELA DO DASHBOARD (VISÃO GERAL)
     ========================================================================== */
  function renderizarTabelaDash(coletas) {
    var tbody = document.getElementById('emp-dash-orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var pendentesOuNovos = coletas.filter(function (c) {
      return c.status === 'pendente' || c.status === 'agendado';
    });

    if (pendentesOuNovos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-grey);padding:2rem;">Nenhum pedido pendente no momento. Todos os atendimentos estão em dia!</td></tr>';
      return;
    }

    var statusMap = {
      'pendente': { label: 'Novo', badgeCls: 'badge-new' },
      'agendado': { label: 'Em andamento', badgeCls: 'badge-prog' },
      'concluido': { label: 'Concluído', badgeCls: 'badge-done' },
      'cancelado': { label: 'Cancelado', badgeCls: 'badge-cancel' }
    };

    pendentesOuNovos.slice(0, 5).forEach(function (c) {
      var tr = document.createElement('tr');
      var clientName = c.cliente_nome || 'Cidadão Solicitante';
      var initials = escapeHtml(clientName.split(' ').map(function(n){return n[0];}).join('').substring(0,2).toUpperCase() || 'CC');
      var stInfo = statusMap[c.status] || statusMap['pendente'];

      var rawDate = c.data_agendada || '';
      var parts = rawDate.split('-');
      var dateFmt = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : rawDate;

      var tags = (c.tipo_residuo || 'Geral').split(',').map(function (t) {
        return '<span class="etag tag-plastic">' + escapeHtml(t.trim()) + '</span>';
      }).join(' ');

      var actionsHtml = '';
      if (c.status === 'pendente') {
        actionsHtml =
          '<div style="display:flex;gap:0.4rem;align-items:center;">' +
            '<button class="btn-table-action btn-success" onclick="atualizarStatusPedido(' + c.id + ', \'agendado\')">Aceitar</button>' +
            '<button class="btn-table-action btn-danger" onclick="atualizarStatusPedido(' + c.id + ', \'cancelado\')">Recusar</button>' +
          '</div>';
      } else {
        actionsHtml =
          '<div style="display:flex;gap:0.4rem;align-items:center;">' +
            (c.status === 'agendado' ? '<button class="btn-table-action btn-success" onclick="atualizarStatusPedido(' + c.id + ', \'concluido\')">✓ Concluir</button>' : '') +
            '<button class="btn-card-action primary" onclick="abrirComprovanteDigital(\'' + escapeHtml(c.protocolo || c.id) + '\')">📄 Comprovante</button>' +
          '</div>';
      }

      tr.innerHTML =
        '<td>' +
          '<div class="table-comp-info">' +
            '<div class="comp-letter text-green-bg">' + initials + '</div>' +
            '<span>' + escapeHtml(clientName) + '</span>' +
          '</div>' +
        '</td>' +
        '<td>' + tags + '</td>' +
        '<td>' + escapeHtml(c.endereco_coleta || 'Santos, SP') + '</td>' +
        '<td>' + escapeHtml(dateFmt) + ' (' + escapeHtml(c.turno || 'Manhã') + ')</td>' +
        '<td><span class="badge ' + stInfo.badgeCls + '">' + stInfo.label + '</span></td>' +
        '<td>' + actionsHtml + '</td>';

      tbody.appendChild(tr);
    });
  }

  /* ==========================================================================
     4. RENDERIZAÇÃO DA TABELA DE PEDIDOS COMPLETA (ABA PEDIDOS)
     ========================================================================== */
  function renderizarTabelaPedidos(coletas) {
    var tbody = document.getElementById('orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var countNovos = 0;
    var countProg = 0;
    var countDone = 0;
    var countCancel = 0;

    var statusFilterKeyMap = {
      'pendente': 'novo',
      'agendado': 'prog',
      'concluido': 'done',
      'cancelado': 'cancel'
    };

    var statusBadgeMap = {
      'pendente': { label: 'Novo', badgeCls: 'badge-new' },
      'agendado': { label: 'Em andamento', badgeCls: 'badge-prog' },
      'concluido': { label: 'Concluído', badgeCls: 'badge-done' },
      'cancelado': { label: 'Recusado / Cancelado', badgeCls: 'badge-cancel' }
    };

    coletas.forEach(function (c) {
      if (c.status === 'pendente') countNovos++;
      else if (c.status === 'agendado') countProg++;
      else if (c.status === 'concluido') countDone++;
      else if (c.status === 'cancelado') countCancel++;
    });

    // Atualiza contadores dos cards e das abas
    setTxt('stat-pedidos-novos', countNovos);
    setTxt('stat-pedidos-prog', countProg);
    setTxt('stat-pedidos-done', countDone);
    setTxt('stat-pedidos-cancel', countCancel);

    setTxt('count-tab-all', coletas.length);
    setTxt('count-tab-novo', countNovos);
    setTxt('count-tab-prog', countProg);
    setTxt('count-tab-done', countDone);
    setTxt('count-tab-cancel', countCancel);

    if (coletas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-grey);padding:3rem;">Nenhum pedido de coleta registrado no sistema.</td></tr>';
      return;
    }

    coletas.forEach(function (c) {
      var filterKey = statusFilterKeyMap[c.status] || 'novo';
      var stInfo = statusBadgeMap[c.status] || statusBadgeMap['pendente'];
      var clientName = c.cliente_nome || 'Cidadão Solicitante';
      var initials = escapeHtml(clientName.split(' ').map(function(n){return n[0];}).join('').substring(0,2).toUpperCase() || 'CC');
      var proto = c.protocolo || ('COL-' + c.id);

      var rawDate = c.data_agendada || '';
      var parts = rawDate.split('-');
      var dateFmt = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : rawDate;
      var peso = (parseFloat(c.peso_estimado_kg) || 1.0).toFixed(1) + ' kg';

      var tags = (c.tipo_residuo || 'Geral').split(',').map(function (t) {
        return '<span class="etag tag-plastic">' + escapeHtml(t.trim()) + '</span>';
      }).join(' ');

      var actionsHtml = '<div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">';
      if (c.status === 'pendente') {
        actionsHtml +=
          '<button class="btn-table-action btn-success" onclick="atualizarStatusPedido(' + c.id + ', \'agendado\')">Aceitar</button>' +
          '<button class="btn-table-action btn-danger" onclick="atualizarStatusPedido(' + c.id + ', \'cancelado\')">Recusar</button>';
      } else if (c.status === 'agendado') {
        actionsHtml +=
          '<button class="btn-table-action btn-success" onclick="atualizarStatusPedido(' + c.id + ', \'concluido\')">✓ Concluir</button>' +
          '<button class="btn-card-action primary" onclick="abrirComprovanteDigital(\'' + escapeHtml(proto) + '\')">📄 Comprovante</button>' +
          '<button class="btn-table-action btn-danger" title="Cancelar Coleta" onclick="atualizarStatusPedido(' + c.id + ', \'cancelado\')">✕</button>';
      } else if (c.status === 'concluido') {
        actionsHtml += '<button class="btn-card-action primary" onclick="abrirComprovanteDigital(\'' + escapeHtml(proto) + '\')">📄 Comprovante</button>';
      } else {
        actionsHtml += '<span style="font-size:0.8rem;color:var(--text-grey);">Cancelado</span>';
      }
      actionsHtml += '</div>';

      var tr = document.createElement('tr');
      tr.dataset.status = filterKey;
      tr.innerHTML =
        '<td>' +
          '<div class="table-comp-info">' +
            '<div class="comp-letter text-green-bg">' + initials + '</div>' +
            '<div>' +
              '<div style="font-weight:600;">' + escapeHtml(clientName) + '</div>' +
              '<div style="font-size:0.75rem;color:var(--text-grey);font-family:monospace;">' + escapeHtml(proto) + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td>' + tags + '</td>' +
        '<td><div style="max-width:220px;font-size:0.84rem;line-height:1.2;">' + escapeHtml(c.endereco_coleta || 'Santos, SP') + '</div></td>' +
        '<td>' + escapeHtml(dateFmt) + '<br><small style="color:var(--text-grey);">' + escapeHtml(c.turno || 'Manhã') + '</small></td>' +
        '<td><strong>' + escapeHtml(peso) + '</strong></td>' +
        '<td><span class="badge ' + stInfo.badgeCls + '">' + stInfo.label + '</span></td>' +
        '<td>' + actionsHtml + '</td>';

      tbody.appendChild(tr);
    });

    filterRows();
  }

  /* ==========================================================================
     5. ATUALIZAR STATUS DE PEDIDO (API POST)
     ========================================================================== */
  function atualizarStatusPedido(coletaId, novoStatus) {
    if (!window.apiFetch) return;

    var statusNomes = {
      'agendado': 'Aceito / Em andamento',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado / Recusado'
    };

    window.toast('⏳ Atualizando status da solicitação...');

    window.apiFetch('api/coletas/update.php', {
      method: 'POST',
      body: {
        coleta_id: coletaId,
        status: novoStatus
      }
    }).then(function (res) {
      if (res && res.success) {
        window.toast('✓ ' + (res.message || 'Status atualizado com sucesso!'));
        carregarPainelEmpresa();
        if (novoStatus === 'concluido' && res.protocolo) {
          window.imprimirComprovantePDF(res.protocolo, false);
        }
      } else {
        window.toast('⚠ ' + (res.error || 'Não foi possível atualizar o status.'));
      }
    }).catch(function (err) {
      console.error('Erro na atualização de status:', err);
      window.toast('⚠ Falha na comunicação com o servidor.');
    });
  }

  /* ==========================================================================
     6. AGENDA E CALENDÁRIO DINÂMICO DE COLETAS (ABA AGENDAMENTOS)
     ========================================================================== */
  function mudarMesCalendario(offset) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + offset);
    renderizarCalendario(cachedColetas);
  }

  function renderizarCalendario(coletas) {
    var calGrid = document.getElementById('cal-grid-days');
    var calTitle = document.getElementById('cal-title');
    if (!calGrid || !calTitle) return;

    var year = calCurrentDate.getFullYear();
    var month = calCurrentDate.getMonth();

    var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    calTitle.textContent = meses[month] + ' ' + year;

    // Primeiro dia da semana e total de dias do mês
    var firstDayIndex = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    // Mapeamento de coletas por data (YYYY-MM-DD)
    var coletasPorData = {};
    var coletasMesTotal = 0;
    var coletasSemanaTotal = 0;
    var coletasHojeTotal = 0;

    var hoje = new Date();
    var hojeStr = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');

    var inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    var fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    (coletas || []).forEach(function (c) {
      var d = c.data_agendada;
      if (!d) return;
      if (!coletasPorData[d]) coletasPorData[d] = [];
      coletasPorData[d].push(c);

      var cDate = new Date(d + 'T00:00:00');
      if (cDate.getFullYear() === year && cDate.getMonth() === month) {
        coletasMesTotal++;
      }
      if (cDate >= inicioSemana && cDate <= fimSemana) {
        coletasSemanaTotal++;
      }
      if (d === hojeStr) {
        coletasHojeTotal++;
      }
    });

    setTxt('ag-stat-hoje', coletasHojeTotal);
    setTxt('ag-stat-semana', coletasSemanaTotal);
    setTxt('ag-stat-mes', coletasMesTotal);

    calGrid.innerHTML = '';

    // Cabeçalho dos dias da semana
    var dows = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    dows.forEach(function (dow) {
      var el = document.createElement('div');
      el.className = 'dow';
      el.textContent = dow;
      calGrid.appendChild(el);
    });

    // Células vazias anteriores
    for (var i = 0; i < firstDayIndex; i++) {
      var empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calGrid.appendChild(empty);
    }

    // Se nenhuma data selecionada, seleciona hoje se estiver no mês atual ou dia 1
    if (!calSelectedDateStr || calSelectedDateStr.indexOf(year + '-' + String(month + 1).padStart(2, '0')) !== 0) {
      calSelectedDateStr = (hoje.getFullYear() === year && hoje.getMonth() === month)
        ? hojeStr
        : (year + '-' + String(month + 1).padStart(2, '0') + '-01');
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var dayEl = document.createElement('div');
      dayEl.className = 'cal-day';
      dayEl.textContent = day;

      var hasEvent = coletasPorData[dateStr] && coletasPorData[dateStr].length > 0;
      if (hasEvent) dayEl.classList.add('has-event');
      if (dateStr === hojeStr) dayEl.classList.add('today');
      if (dateStr === calSelectedDateStr) dayEl.classList.add('selected');

      (function (dStr, dNum) {
        dayEl.addEventListener('click', function () {
          document.querySelectorAll('.cal-day.selected').forEach(function (el) {
            el.classList.remove('selected');
          });
          dayEl.classList.add('selected');
          calSelectedDateStr = dStr;
          renderizarListaAgendaDia(dStr, coletasPorData[dStr] || []);
        });
      })(dateStr, day);

      calGrid.appendChild(dayEl);
    }

    renderizarListaAgendaDia(calSelectedDateStr, coletasPorData[calSelectedDateStr] || []);
  }

  function renderizarListaAgendaDia(dateStr, items) {
    var titleEl = document.getElementById('cal-selected-day-title');
    var listEl = document.getElementById('emp-agenda-list');
    if (!listEl) return;

    var parts = dateStr.split('-');
    if (titleEl && parts.length === 3) {
      var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      titleEl.textContent = 'Agendamentos: ' + parts[2] + ' de ' + meses[parseInt(parts[1], 10) - 1] + ' de ' + parts[0];
    }

    listEl.innerHTML = '';

    if (items.length === 0) {
      listEl.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--text-grey);font-size:0.9rem;">Nenhuma coleta agendada para este dia.<br><small style="color:var(--g500);">Novos pedidos aceitos aparecerão automaticamente aqui.</small></div>';
      return;
    }

    items.forEach(function (c) {
      var itemEl = document.createElement('div');
      itemEl.className = 'agenda-item';

      var statusCls = c.status === 'concluido' ? 'confirmed' : (c.status === 'agendado' ? 'confirmed' : 'pending');
      var statusLbl = c.status === 'concluido' ? 'Concluída' : (c.status === 'agendado' ? 'Confirmado' : 'Pendente');

      itemEl.innerHTML =
        '<div class="agenda-time">' + (c.turno || 'Manhã') + '</div>' +
        '<div class="agenda-info">' +
          '<h4>' + (c.cliente_nome || 'Cliente Cidadão') + '</h4>' +
          '<p>' + (c.tipo_residuo || 'Resíduos') + ' · ' + (c.peso_estimado_kg || 1) + ' kg · ' + (c.endereco_coleta || 'Santos, SP') + '</p>' +
        '</div>' +
        '<span class="agenda-status ' + statusCls + '">' + statusLbl + '</span>';

      listEl.appendChild(itemEl);
    });
  }

  /* ==========================================================================
     7. RELATÓRIOS E ESTATÍSTICAS DINÂMICAS (ABA RELATÓRIOS)
     ========================================================================== */
  function renderizarGraficosRelatorio(coletas) {
    var barChart = document.getElementById('rel-bar-chart');
    var barLabels = document.getElementById('rel-bar-labels');
    if (!barChart || !barLabels) return;

    var mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var hoje = new Date();
    var ultimos6Meses = [];

    for (var i = 5; i >= 0; i--) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      ultimos6Meses.push({
        ano: d.getFullYear(),
        mes: d.getMonth(),
        label: mesesNomes[d.getMonth()],
        total: 0
      });
    }

    var catCounts = { 'Plástico': 0, 'Papel': 0, 'Vidro': 0, 'Eletrônicos': 0, 'Metal': 0 };
    var totalCategorias = 0;

    (coletas || []).forEach(function (c) {
      var rawDate = c.data_agendada;
      if (rawDate) {
        var cDate = new Date(rawDate + 'T00:00:00');
        ultimos6Meses.forEach(function (mObj) {
          if (cDate.getFullYear() === mObj.ano && cDate.getMonth() === mObj.mes) {
            mObj.total++;
          }
        });
      }

      var tipos = (c.tipo_residuo || '').toLowerCase();
      if (tipos.includes('plást') || tipos.includes('plast')) { catCounts['Plástico']++; totalCategorias++; }
      if (tipos.includes('papel') || tipos.includes('papelão')) { catCounts['Papel']++; totalCategorias++; }
      if (tipos.includes('vidro')) { catCounts['Vidro']++; totalCategorias++; }
      if (tipos.includes('eletr')) { catCounts['Eletrônicos']++; totalCategorias++; }
      if (tipos.includes('metal')) { catCounts['Metal']++; totalCategorias++; }
    });

    var maxCount = Math.max.apply(null, ultimos6Meses.map(function(m){return m.total;})) || 1;

    barChart.innerHTML = '';
    barLabels.innerHTML = '';

    ultimos6Meses.forEach(function (m, idx) {
      var pct = Math.max(15, Math.round((m.total / maxCount) * 100));
      var isPeak = idx === ultimos6Meses.length - 1;

      var bar = document.createElement('div');
      bar.className = 'bar' + (isPeak ? ' peak' : '');
      bar.style.height = pct + '%';
      bar.title = m.label + ': ' + m.total + ' coletas';
      barChart.appendChild(bar);

      var lbl = document.createElement('span');
      lbl.textContent = m.label;
      barLabels.appendChild(lbl);
    });

    if (totalCategorias > 0) {
      setTxt('pct-plastico', Math.round((catCounts['Plástico'] / totalCategorias) * 100) + '%');
      setTxt('pct-papel', Math.round((catCounts['Papel'] / totalCategorias) * 100) + '%');
      setTxt('pct-vidro', Math.round((catCounts['Vidro'] / totalCategorias) * 100) + '%');
      setTxt('pct-eletronicos', Math.round((catCounts['Eletrônicos'] / totalCategorias) * 100) + '%');
      setTxt('pct-metal', Math.round((catCounts['Metal'] / totalCategorias) * 100) + '%');
    }
  }

  function renderizarTopClientes(topClientes) {
    var tbody = document.getElementById('rel-top-clientes-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!topClientes || topClientes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-grey);padding:2rem;">Nenhum cliente registrado no histórico da empresa até o momento.</td></tr>';
      return;
    }

    topClientes.forEach(function (tc) {
      var tr = document.createElement('tr');
      var name = tc.nome || 'Cliente';
      var initials = name.split(' ').map(function(n){return n[0];}).join('').substring(0,2).toUpperCase() || 'CC';
      var cidade = (tc.cidade || 'Santos') + (tc.uf ? ', ' + tc.uf : '');
      var coletasCount = tc.total_coletas || 1;
      var massa = (parseFloat(tc.massa_total) || 1.0).toFixed(1) + ' kg';
      var rawDate = tc.ultima_data || '';
      var parts = rawDate.split('-');
      var dateFmt = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : rawDate;

      tr.innerHTML =
        '<td><div class="table-comp-info"><div class="comp-letter text-green-bg">' + initials + '</div><span>' + name + '</span></div></td>' +
        '<td>' + cidade + '</td>' +
        '<td><strong>' + coletasCount + '</strong></td>' +
        '<td>' + massa + '</td>' +
        '<td>' + dateFmt + '</td>';

      tbody.appendChild(tr);
    });
  }

  /* ==========================================================================
     8. AVALIAÇÕES DE CLIENTES (ABA AVALIAÇÕES)
     ========================================================================== */
  function carregarAvaliacoesEmpresa() {
    if (!window.apiFetch) return;

    window.apiFetch('api/avaliacoes/index.php').then(function (res) {
      if (res && res.success) {
        cachedAvaliacoes = res.avaliacoes || [];
        renderizarAvaliacoes(res);
      }
    }).catch(function (err) {
      console.warn('Erro ao carregar avaliações:', err);
    });
  }

  function renderizarAvaliacoes(res) {
    var mediaEl = document.getElementById('rev-summary-score');
    var starsEl = document.getElementById('rev-summary-stars');
    var totalEl = document.getElementById('rev-summary-total');
    var listEl = document.getElementById('review-list');

    var media = parseFloat(res.nota_media || 5.0).toFixed(1);
    var total = res.total || 0;
    var dist = res.distribuicao || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (mediaEl) mediaEl.textContent = media;
    if (totalEl) totalEl.textContent = 'Baseado em ' + total + ' avaliações';

    var starStr = '★ ★ ★ ★ ★';
    if (starsEl) starsEl.textContent = starStr;

    // Barras de distribuição
    [5, 4, 3, 2, 1].forEach(function (star) {
      var cnt = dist[star] || 0;
      var pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
      var fillEl = document.getElementById('rb-fill-' + star);
      var cntEl = document.getElementById('rb-cnt-' + star);
      if (fillEl) fillEl.style.width = pct + '%';
      if (cntEl) cntEl.textContent = cnt;
    });

    if (!listEl) return;
    listEl.innerHTML = '';

    if (cachedAvaliacoes.length === 0) {
      listEl.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-grey);">Sua empresa ainda não possui avaliações registradas pelos cidadãos.</div>';
      return;
    }

    cachedAvaliacoes.forEach(function (av) {
      var item = document.createElement('div');
      item.className = 'review-item';
      item.dataset.rating = av.nota;

      var name = av.cliente_nome || 'Cliente Cidadão';
      var initials = escapeHtml(name.split(' ').map(function(n){return n[0];}).join('').substring(0,2).toUpperCase() || 'CC');
      var cidade = (av.cliente_cidade || 'Santos') + (av.cliente_uf ? ', ' + av.cliente_uf : '');
      var dateStr = av.created_at ? new Date(av.created_at).toLocaleDateString('pt-BR') : '';

      var stars = '★'.repeat(parseInt(av.nota, 10)) + '☆'.repeat(5 - parseInt(av.nota, 10));

      item.innerHTML =
        '<div class="rev-head">' +
          '<div class="rev-avatar">' + initials + '</div>' +
          '<div>' +
            '<div class="rev-name">' + escapeHtml(name) + '</div>' +
            '<div class="rev-date">' + escapeHtml(dateStr) + ' · ' + escapeHtml(cidade) + '</div>' +
          '</div>' +
          '<div class="rev-stars">' + stars + '</div>' +
        '</div>' +
        '<div class="rev-text">' + escapeHtml(av.comentario || 'Coleta realizada com sucesso e materiais entregues de acordo com o agendado.') + '</div>' +
        '<button class="btn-reply" onclick="toast(\'Obrigado pelo retorno! Resposta enviada ao cliente.\', \'success\')">Agradecer</button>';

      listEl.appendChild(item);
    });
  }

  function filterReviews(filter) {
    document.querySelectorAll('.review-item').forEach(function (item) {
      var rating = parseInt(item.dataset.rating, 10);
      var show = true;
      if (filter === 'all') show = true;
      else if (filter === 'low') show = rating <= 2;
      else show = rating === parseInt(filter, 10);
      item.style.display = show ? '' : 'none';
    });
  }

  /* ==========================================================================
     9. FILTROS E BUSCA NA LISTA DE PEDIDOS
     ========================================================================== */
  function setTab(btn, filter) {
    activeOrdersFilter = filter;
    document.querySelectorAll('.page-tabs .tab-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    filterRows();
  }

  function filterRows() {
    var input = document.getElementById('search-orders') || document.getElementById('search-input');
    var query = input ? input.value.toLowerCase() : '';
    document.querySelectorAll('#orders-tbody tr').forEach(function (tr) {
      var status = tr.dataset.status;
      var text = tr.textContent.toLowerCase();
      var okStatus = activeOrdersFilter === 'all' || status === activeOrdersFilter;
      var okSearch = text.includes(query);
      tr.style.display = okStatus && okSearch ? '' : 'none';
    });
  }

  /* ==========================================================================
     10. GESTÃO DO PERFIL DA EMPRESA
     ========================================================================== */
  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setTxt(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function carregarPerfilEmpresa() {
    if (!window.apiFetch) return;

    window.apiFetch('api/auth/me.php').then(function (res) {
      if (!res || !res.authenticated) return;

      var d = res.empresa || res.user;
      if (!d) return;

      var name = d.razao_social || d.nome || 'Empresa Parceira';
      var email = d.email || '';
      var initials = name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase() || 'EC';
      var memberSince = d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Mai/2024';

      var cardAvatar = document.getElementById('emp-card-avatar');
      var cardName = document.getElementById('emp-card-name');
      var cardEmail = document.getElementById('emp-card-email');
      var statColetas = document.getElementById('emp-card-coletas');
      var statNota = document.getElementById('emp-card-nota');
      var statMembro = document.getElementById('emp-card-membro');

      if (cardAvatar) {
        if (d.avatar_url) {
          cardAvatar.innerHTML = '<img src="' + d.avatar_url + '?v=' + Date.now() + '" alt="Logotipo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">';
        } else {
          cardAvatar.textContent = initials;
        }
      }
      if (cardName) cardName.textContent = name;
      if (cardEmail) cardEmail.textContent = email;
      if (statColetas) statColetas.textContent = (d.coletas_concluidas || 0) + ' coletas';
      if (statNota) statNota.textContent = (d.nota_media || '5.00') + ' ★';
      if (statMembro) statMembro.textContent = memberSince;

      atualizarBotaoRemoverAvatarEmpresa(d.avatar_url);

      setVal('emp-input-nome', d.razao_social || d.nome);
      setVal('emp-input-cnpj', d.cnpj || d.cpf);
      setVal('emp-input-categoria', d.categoria || 'Reciclagem Geral');
      setVal('emp-input-email', d.email);
      setVal('emp-input-telefone', d.telefone);
      setVal('emp-input-cep', d.cep);
      setVal('emp-input-cidade', d.cidade || 'Santos');
      setVal('emp-input-uf', d.uf || 'SP');
      setVal('emp-input-logradouro', d.logradouro);
      setVal('emp-input-numero', d.numero);
      setVal('emp-input-bairro', d.bairro);
      setVal('emp-input-complemento', d.complemento);
      setVal('emp-input-descricao', d.descricao);

      setVal('emp-input-senha', '');
      setVal('emp-input-senha-conf', '');
    }).catch(function (err) {
      console.warn('Erro ao carregar dados do perfil da empresa:', err);
    });
  }

  function uploadAvatarEmpresa(input) {
    if (!input || !input.files || input.files.length === 0) return;
    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      window.toast('❌ A imagem selecionada ultrapassa o limite de 5MB.');
      input.value = '';
      return;
    }

    var formData = new FormData();
    formData.append('avatar', file);

    window.toast('⏳ Enviando logotipo da empresa...');

    fetch('api/auth/upload_avatar.php', {
      method: 'POST',
      body: formData
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      input.value = '';
      if (data && data.success) {
        window.toast('✓ ' + (data.message || 'Logotipo atualizado!'));
        try {
          var u = JSON.parse(sessionStorage.getItem('ecocall_user') || '{}');
          u.avatar_url = data.avatar_url;
          if (u.empresa) u.empresa.avatar_url = data.avatar_url;
          sessionStorage.setItem('ecocall_user', JSON.stringify(u));
        } catch(e) {}

        if (window.syncUserProfile) {
          window.syncUserProfile();
        }
        carregarPerfilEmpresa();
      } else {
        window.toast('⚠ ' + (data.error || 'Falha ao atualizar logotipo.'));
      }
    })
    .catch(function (err) {
      input.value = '';
      console.error('Erro no upload de logotipo:', err);
      window.toast('⚠ Falha na comunicação com o servidor.');
    });
  }

  function removerAvatarEmpresa() {
    if (!confirm('Deseja remover o logotipo e voltar às iniciais?')) return;
    window.toast('⏳ Removendo logotipo...');

    fetch('api/auth/upload_avatar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remover' })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.success) {
        window.toast('✓ Logotipo removido.');
        try {
          var u = JSON.parse(sessionStorage.getItem('ecocall_user') || '{}');
          u.avatar_url = null;
          if (u.empresa) u.empresa.avatar_url = null;
          sessionStorage.setItem('ecocall_user', JSON.stringify(u));
        } catch(e) {}

        if (window.syncUserProfile) {
          window.syncUserProfile();
        }
        carregarPerfilEmpresa();
      } else {
        window.toast('⚠ ' + (data.error || 'Falha ao remover logotipo.'));
      }
    });
  }

  function atualizarBotaoRemoverAvatarEmpresa(avatarUrl) {
    var btn = document.getElementById('btn-emp-remover-avatar');
    if (btn) {
      btn.style.display = avatarUrl ? 'inline-block' : 'none';
    }
  }

  function salvarPerfilEmpresa(e) {
    if (e && e.preventDefault) e.preventDefault();

    var senha = getVal('emp-input-senha');
    var senhaConf = getVal('emp-input-senha-conf');

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

    var btnSave = document.getElementById('emp-btn-save');
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'Salvando...';
    }

    var payload = {
      razao_social: getVal('emp-input-nome'),
      nome: getVal('emp-input-nome'),
      email: getVal('emp-input-email'),
      cnpj: getVal('emp-input-cnpj'),
      cpf: getVal('emp-input-cnpj'),
      categoria: getVal('emp-input-categoria'),
      telefone: getVal('emp-input-telefone'),
      cep: getVal('emp-input-cep'),
      cidade: getVal('emp-input-cidade'),
      uf: getVal('emp-input-uf'),
      logradouro: getVal('emp-input-logradouro'),
      numero: getVal('emp-input-numero'),
      bairro: getVal('emp-input-bairro'),
      complemento: getVal('emp-input-complemento'),
      descricao: getVal('emp-input-descricao'),
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
        window.toast('✓ ' + (res.message || 'Perfil corporativo atualizado com sucesso!'));
        if (window.syncUserProfile) window.syncUserProfile();
        carregarPerfilEmpresa();
      } else {
        window.toast('⚠ ' + (res.error || 'Falha ao atualizar perfil.'));
      }
    }).catch(function (err) {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'Salvar alterações';
      }
      console.error('Erro ao salvar perfil da empresa:', err);
      window.toast('⚠ Falha na comunicação com o servidor.');
    });
  }

  function excluirCadastroEmpresa() {
    var confirm1 = confirm('⚠️ ATENÇÃO: Esta ação é definitiva e irreversível.\n\nTem certeza absoluta de que deseja excluir permanentemente o cadastro da empresa, atendimentos e histórico de avaliações da plataforma EcoCall?');
    if (!confirm1) return;

    var confirm2 = prompt('Digite "EXCLUIR" em letras maiúsculas para confirmar o encerramento definitivo do cadastro da empresa:');
    if (confirm2 !== 'EXCLUIR') {
      window.toast('ℹ️ Operação de exclusão corporativa cancelada.');
      return;
    }

    window.toast('⏳ Excluindo cadastro da empresa...');

    if (window.apiFetch) {
      window.apiFetch('api/auth/delete_account.php', {
        method: 'POST'
      }).then(function (res) {
        if (res && res.success) {
          try { sessionStorage.removeItem('ecocall_user'); } catch (e) {}
          window.toast('✓ ' + (res.message || 'Cadastro corporativo excluído com sucesso. Redirecionando...'));
          setTimeout(function () {
            window.location.replace('ecocall-home.html');
          }, 1200);
        } else {
          window.toast('❌ ' + (res.error || 'Não foi possível excluir o cadastro da empresa.'));
        }
      }).catch(function (err) {
        console.error('Erro ao excluir empresa:', err);
        window.toast('❌ Falha na comunicação com o servidor.');
      });
    }
  }

  /* ==========================================================================
     11. INICIALIZAÇÃO DO PAINEL DA EMPRESA
     ========================================================================== */
  function initDashboardEmpresa() {
    carregarPainelEmpresa();

    var params = new URLSearchParams(location.search);
    var targetTab = params.get('tab') || (location.hash || '').replace('#', '').toLowerCase();
    var allowedTabs = ['dash', 'pedidos', 'agendamentos', 'relatorios', 'perfil', 'avaliacoes'];
    
    if (allowedTabs.indexOf(targetTab) !== -1) {
      switchEmpresaTab(targetTab);
    } else {
      switchEmpresaTab('dash');
    }
  }

  document.addEventListener('DOMContentLoaded', initDashboardEmpresa);

  window.switchEmpresaTab = switchEmpresaTab;
  window.carregarPainelEmpresa = carregarPainelEmpresa;
  window.carregarPerfilEmpresa = carregarPerfilEmpresa;
  window.salvarPerfilEmpresa = salvarPerfilEmpresa;
  window.uploadAvatarEmpresa = uploadAvatarEmpresa;
  window.removerAvatarEmpresa = removerAvatarEmpresa;
  window.excluirCadastroEmpresa = excluirCadastroEmpresa;
  window.carregarEstatisticasEmpresa = carregarEstatisticasEmpresa;
  window.atualizarStatusPedido = atualizarStatusPedido;
  window.mudarMesCalendario = mudarMesCalendario;
  window.setTab = setTab;
  window.filterRows = filterRows;
  window.filterReviews = filterReviews;
})();
