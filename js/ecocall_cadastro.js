/* Wizard de cadastro: alternância usuário/empresa, validação por etapa e máscaras. */
(function () {
  var tipo = 'user';

  function irParaHome()  { window.showLoader('ecocall-home.html'); }
  function irParaLogin() { window.showLoader('ecocall-login.html', { delay: 1200 }); }

  function setType(t, el) {
    tipo = t;
    document.querySelectorAll('.type-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    el.classList.add('active');
    var lbl = document.getElementById('ps2lbl');
    if (lbl) lbl.textContent = t === 'empresa' ? 'Empresa' : 'Dados';
    document.getElementById('step1-user').classList.toggle('active', t === 'user');
    document.getElementById('step1-empresa').classList.toggle('active', t === 'empresa');
  }

  function goStep2() {
    var em = document.getElementById('email').value.trim();
    var p1 = document.getElementById('pwd').value;
    var p2 = document.getElementById('pwd2').value;
    if (!em || !em.includes('@')) { showCadToast('⚠ Informe um e-mail válido'); return; }
    if (p1.length < 6)            { showCadToast('⚠ Senha deve ter ao menos 6 caracteres'); return; }
    if (p1 !== p2)                { showCadToast('⚠ As senhas não coincidem'); return; }
    goStep(2);
  }

  function goStep(n) {
    ['step1-user', 'step1-empresa', 'step2-user', 'step2-empresa', 'step3'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    ['ps1', 'ps2', 'ps3'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (i + 1 < n) el.classList.add('done');
      else if (i + 1 === n) el.classList.add('active');
    });
    ['pl1', 'pl2'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('done', i + 1 < n);
    });
    if (n === 1) document.getElementById('step1-' + tipo).classList.add('active');
    else if (n === 2) document.getElementById('step2-' + tipo).classList.add('active');
    else if (n === 3) {
      document.getElementById('step3').classList.add('active');
      showCadToast('✓ Cadastro realizado com sucesso!');
    }
  }

  function togglePwd(id, btn) {
    var inp = document.getElementById(id);
    var show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    var svg = btn.querySelector('svg');
    if (!svg) return;
    svg.innerHTML = show
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }

  function checkStr(v) {
    var colors = ['#e24b4b', '#f5a623', '#f5cc23', '#3ec96a'];
    var labels = ['Muito fraca', 'Fraca', 'Boa', 'Forte'];
    var s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    ['sb1', 'sb2', 'sb3', 'sb4'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) el.style.background = i < s ? colors[s - 1] : 'var(--gray-200)';
    });
    var lbl = document.getElementById('str-lbl');
    if (!lbl) return;
    lbl.textContent = v.length ? labels[Math.max(0, s - 1)] : 'Digite uma senha';
    lbl.style.color = v.length ? colors[Math.max(0, s - 1)] : 'var(--textl)';
  }

  function maskCPF(i)   { i.value = i.value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
  function maskPhone(i) { i.value = i.value.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'); }
  function maskCEP(i)   { i.value = i.value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'); }
  function maskCNPJ(i)  { i.value = i.value.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2'); }

  function showCadToast(msg, dur) {
    dur = dur || 3000;
    var t = document.getElementById('toast');
    if (!t) return;
    var msgEl = document.getElementById('tmsg');
    if (msgEl) msgEl.textContent = msg;
    t.classList.add('on');
    setTimeout(function () { t.classList.remove('on'); }, dur);
  }

  window.irParaHome = irParaHome;
  window.irParaLogin = irParaLogin;
  window.setType = setType;
  window.goStep = goStep;
  window.goStep2 = goStep2;
  window.togglePwd = togglePwd;
  window.checkStr = checkStr;
  window.maskCPF = maskCPF;
  window.maskPhone = maskPhone;
  window.maskCEP = maskCEP;
  window.maskCNPJ = maskCNPJ;
  window.toast = showCadToast;
})();
