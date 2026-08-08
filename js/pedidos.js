/* Filtros de status e busca da listagem de pedidos. */
(function () {
  var activeFilter = 'all';

  function setTab(btn, filter) {
    activeFilter = filter;
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    filterRows();
  }

  function filterRows() {
    var input = document.getElementById('search-input');
    var query = input ? input.value.toLowerCase() : '';
    document.querySelectorAll('#orders-tbody tr').forEach(function (tr) {
      var status = tr.dataset.status;
      var text = tr.textContent.toLowerCase();
      var okStatus = activeFilter === 'all' || status === activeFilter;
      var okSearch = text.includes(query);
      tr.style.display = okStatus && okSearch ? '' : 'none';
    });
  }

  window.setTab = setTab;
  window.filterRows = filterRows;
})();
