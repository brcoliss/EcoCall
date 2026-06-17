/* Listagem de coletas: filtros, busca, ordenação e painel de detalhes. */
(function () {
  var activeFilter = 'all';

  function setFilter(btn, f) {
    activeFilter = f;
    document.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    applyFilters();
  }

  function filterCards() { applyFilters(); }

  function applyFilters() {
    var input = document.getElementById('search-input');
    var q = input ? input.value.toLowerCase() : '';
    var cards = document.querySelectorAll('.coleta-card');
    var visible = 0;
    cards.forEach(function (c) {
      var matchStatus = activeFilter === 'all' || c.dataset.status === activeFilter;
      var matchSearch = c.dataset.company.toLowerCase().includes(q);
      var show = matchStatus && matchSearch;
      c.style.display = show ? 'grid' : 'none';
      if (show) visible++;
    });
    var empty = document.getElementById('empty-state');
    if (empty) empty.classList.toggle('show', visible === 0);
    var pagination = document.getElementById('pagination');
    if (pagination) pagination.style.display = visible === 0 ? 'none' : 'flex';
    var info = document.getElementById('pag-info');
    if (info) info.textContent = 'Exibindo ' + visible + ' de 12 coletas';
  }

  function sortCards(val) {
    var grid = document.getElementById('coletas-grid');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.coleta-card'));
    cards.sort(function (a, b) {
      if (val === 'date-desc')   return b.dataset.date.localeCompare(a.dataset.date);
      if (val === 'date-asc')    return a.dataset.date.localeCompare(b.dataset.date);
      if (val === 'weight-desc') return parseInt(b.dataset.weight, 10) - parseInt(a.dataset.weight, 10);
      return 0;
    });
    cards.forEach(function (c) { grid.appendChild(c); });
    window.toast('Lista reordenada.');
  }

  var badges = {
    done:   '<span class="badge badge-done">Concluída</span>',
    sched:  '<span class="badge badge-sched">Agendada</span>',
    prog:   '<span class="badge badge-prog">Em andamento</span>',
    cancel: '<span class="badge badge-cancel">Cancelada</span>',
  };

  function buildTimeline(status, date) {
    var map = {
      done: [
        { label: 'Solicitação recebida', date: 'confirmado',  cls: 'done' },
        { label: 'Coleta confirmada',    date: 'confirmado',  cls: 'done' },
        { label: 'Coleta em rota',       date: 'finalizado',  cls: 'done' },
        { label: 'Coleta concluída',     date: date,          cls: 'done' },
      ],
      sched: [
        { label: 'Solicitação recebida', date: 'confirmado',  cls: 'done' },
        { label: 'Coleta confirmada',    date: date,          cls: 'done' },
        { label: 'Coleta em rota',       date: 'Aguardando',  cls: 'wait' },
        { label: 'Coleta concluída',     date: 'Pendente',    cls: 'wait' },
      ],
      prog: [
        { label: 'Solicitação recebida', date: 'confirmado',  cls: 'done' },
        { label: 'Coleta confirmada',    date: 'confirmado',  cls: 'done' },
        { label: 'Coleta em rota',       date: 'Em andamento', cls: 'active' },
        { label: 'Coleta concluída',     date: 'Pendente',    cls: 'wait' },
      ],
      cancel: [
        { label: 'Solicitação recebida', date: 'confirmado',  cls: 'done' },
        { label: 'Coleta cancelada',     date: date,          cls: 'wait' },
      ],
    };
    return (map[status] || []).map(function (s) {
      return '<div class="tl-item">' +
        '<div class="tl-dot ' + s.cls + '"></div>' +
        '<div class="tl-text">' +
          '<div class="tl-label">' + s.label + '</div>' +
          '<div class="tl-date">'  + s.date  + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  var actions = {
    done:   '<button class="btn-detail-primary" onclick="toast(\'Baixando comprovante PDF…\')">Baixar comprovante</button><button class="btn-detail-secondary" onclick="toast(\'Abrindo nova solicitação…\')">Solicitar nova coleta</button>',
    sched:  '<button class="btn-detail-primary" onclick="toast(\'Abrindo reagendamento…\')">Reagendar</button><button class="btn-detail-secondary" onclick="toast(\'Cancelamento solicitado.\')">Cancelar coleta</button>',
    prog:   '<button class="btn-detail-primary" onclick="toast(\'Rastreando caminhão em tempo real…\')">Rastrear agora</button><button class="btn-detail-secondary" onclick="toast(\'Entrando em contato com a empresa…\')">Falar com empresa</button>',
    cancel: '<button class="btn-detail-primary" onclick="toast(\'Abrindo nova solicitação…\')">Solicitar novamente</button>',
  };

  function openDetail(company, loc, letter, avClass, status, day, month, weight, tipos, date, id) {
    document.getElementById('dp-title').textContent   = 'Coleta #' + id;
    document.getElementById('dp-company').textContent = company;
    document.getElementById('dp-loc').textContent     = '📍 ' + loc;
    document.getElementById('dp-id').textContent      = id;
    document.getElementById('dp-date').textContent    = date;
    document.getElementById('dp-tipos').textContent   = tipos;
    document.getElementById('dp-weight').textContent  = weight + ' kg';

    var av = document.getElementById('dp-avatar');
    av.textContent = letter;
    av.className = 'coleta-avatar ' + avClass;

    document.getElementById('dp-badge').innerHTML    = badges[status]  || '';
    document.getElementById('dp-timeline').innerHTML = buildTimeline(status, date);
    document.getElementById('dp-actions').innerHTML  = actions[status] || '';

    document.getElementById('overlay').classList.add('show');
    document.getElementById('detail-panel').classList.add('open');
  }

  function closeDetail() {
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('detail-panel').classList.remove('open');
  }

  window.setFilter = setFilter;
  window.filterCards = filterCards;
  window.applyFilters = applyFilters;
  window.sortCards = sortCards;
  window.openDetail = openDetail;
  window.closeDetail = closeDetail;
})();
