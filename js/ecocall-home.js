/* Landing page pública: nav sticky, busca, chips de cidade, filtros e CTAs. */
(function () {
  window.addEventListener('scroll', function () {
    var nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
  });

  function buscar() {
    var input = document.getElementById('hs');
    var value = input ? input.value.trim() : '';
    if (!value) {
      window.toast('⚠ Digite uma cidade ou bairro');
      return;
    }
    window.toast('🔍 Buscando empresas em "' + value + '"…');
  }

  function sc(city) {
    var input = document.getElementById('hs');
    if (input) input.value = city;
    window.toast('📍 ' + city + ' selecionada');
  }

  function filt(btn) {
    document.querySelectorAll('.fbtn').forEach(function (b) {
      b.classList.remove('on');
    });
    btn.classList.add('on');
    window.toast('Filtrando: ' + btn.textContent);
  }

  function irParaMapa()    { window.showLoader('mapa.html'); }
  function irParaLogin()   { window.showLoader('ecocall-login.html'); }
  function irParaCadastro(){ window.showLoader('ecocall_cadastro.html'); }

  document.addEventListener('DOMContentLoaded', function () {
    var hs = document.getElementById('hs');
    if (hs) hs.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') buscar();
    });
  });

  window.buscar = buscar;
  window.sc = sc;
  window.filt = filt;
  window.irParaMapa = irParaMapa;
  window.irParaLogin = irParaLogin;
  window.irParaCadastro = irParaCadastro;
})();
