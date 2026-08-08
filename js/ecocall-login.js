/* Lógica da tela de login: validação, toggle de senha, social, redirecionamentos. */
(function () {
  var loginBtn, emailInput, pwdInput, toastEl, toastMsg, togglePwd;
  var pwdVisible = false;

  function showToast(msg, dur) {
    dur = dur || 3000;
    if (!toastEl) return;
    if (toastMsg) toastMsg.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(function () { toastEl.classList.remove('show'); }, dur);
  }

  function irParaHome() {
    window.showLoader('ecocall-home.html');
  }

  function handleTogglePwd() {
    pwdVisible = !pwdVisible;
    pwdInput.type = pwdVisible ? 'text' : 'password';
    var eye = document.getElementById('eyeIco');
    if (!eye) return;
    eye.innerHTML = pwdVisible
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }

  function handleLogin() {
    var email = emailInput.value.trim();
    var pwd = pwdInput.value;
    if (!email || !email.includes('@')) {
      showToast('⚠ Informe um e-mail válido');
      emailInput.focus();
      return;
    }
    if (pwd.length < 6) {
      showToast('⚠ Senha deve ter ao menos 6 caracteres');
      pwdInput.focus();
      return;
    }
    loginBtn.textContent = 'Entrando...';
    loginBtn.disabled = true;
    showToast('Verificando credenciais no servidor...');

    window.apiFetch('api/auth/login.php', {
      method: 'POST',
      body: { email: email, password: pwd }
    }).then(function (data) {
      if (data.error) {
        showToast('⚠ ' + data.error);
        loginBtn.textContent = '→ Entrar na plataforma';
        loginBtn.disabled = false;
        return;
      }
      showToast('✓ ' + (data.message || 'Login realizado com sucesso!'));
      loginBtn.textContent = '✓ Acesso liberado';
      loginBtn.style.background = '#256b3e';
      setTimeout(function () {
        window.showLoader(data.redirect || 'ecocall-dashbord_usuario.html', { delay: 400 });
      }, 800);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loginBtn   = document.getElementById('loginBtn');
    emailInput = document.getElementById('email');
    pwdInput   = document.getElementById('password');
    toastEl    = document.getElementById('toast');
    toastMsg   = document.getElementById('toastMsg');
    togglePwd  = document.getElementById('togglePwd');

    if (togglePwd) togglePwd.addEventListener('click', handleTogglePwd);
    if (loginBtn)  loginBtn.addEventListener('click', handleLogin);

    document.querySelectorAll('.btn-social').forEach(function (b) {
      b.addEventListener('click', function () {
        showToast('Conectando com ' + b.textContent.trim() + '...');
      });
    });

    var signup = document.getElementById('signupLink');
    if (signup) signup.addEventListener('click', function (e) {
      e.preventDefault();
      window.showLoader('ecocall_cadastro.html');
    });

    if (emailInput) emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') pwdInput.focus();
    });
    if (pwdInput) pwdInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') loginBtn.click();
    });
  });

  window.irParaHome = irParaHome;
})();
