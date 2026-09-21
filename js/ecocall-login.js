/* ==========================================================================
   EcoCall — Lógica de Login, Recuperação de Senha Multi-Canal e Ativação de Conta
   ========================================================================== */
(function () {
  var loginBtn, emailInput, pwdInput, toastEl, toastMsg, togglePwd;
  var pwdVisible = false;
  var currentForgotMethod = 'email';
  var lastSentIdentificador = '';

  function showToast(msg, dur) {
    dur = dur || 3500;
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastMsg) toastMsg = document.getElementById('toastMsg') || document.getElementById('tmsg');
    if (toastMsg) toastMsg.textContent = msg;
    if (toastEl) {
      toastEl.classList.add('show');
      setTimeout(function () { toastEl.classList.remove('show'); }, dur);
    }
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
        showToast('⚠ ' + data.error, 5000);
        loginBtn.textContent = '→ Entrar na plataforma';
        loginBtn.disabled = false;

        if (data.pending_activation) {
          setTimeout(function () {
            openResendModal(data.email || email, data.link_ativacao);
          }, 600);
        }
        return;
      }
      if (data.user) {
        try { sessionStorage.setItem('ecocall_user', JSON.stringify(data.user)); } catch (e) {}
      }
      showToast('✓ ' + (data.message || 'Login realizado com sucesso!'));
      loginBtn.textContent = '✓ Acesso liberado';
      loginBtn.style.background = '#256b3e';
      setTimeout(function () {
        var isEmpresa = (data.user && (data.user.tipo === 'empresa' || data.user.empresa_id)) || (data.redirect && data.redirect.indexOf('dashboard_empresa') !== -1);
        var targetRedirect = data.redirect || (isEmpresa ? 'dashboard_empresa.html' : 'ecocall-dashbord_usuario.html');
        window.showLoader(targetRedirect, { delay: 400 });
      }, 800);
    }).catch(function (err) {
      loginBtn.textContent = '→ Entrar na plataforma';
      loginBtn.disabled = false;
      showToast('⚠ Falha de conexão com o servidor.');
    });
  }

  /* ==========================================================================
     MODAL DE RECUPERAÇÃO DE SENHA (EXCLUSIVO POR E-MAIL)
     ========================================================================== */
  function openForgotModal() {
    var overlay = document.getElementById('forgot-overlay');
    var modal = document.getElementById('forgot-modal');
    var input = document.getElementById('forgot-identificador');
    if (input && emailInput && emailInput.value) {
      input.value = emailInput.value.trim();
    }
    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');
    voltarPasso1Recuperacao();
    if (input) setTimeout(function () { input.focus(); }, 150);
  }

  function closeForgotModal() {
    var overlay = document.getElementById('forgot-overlay');
    var modal = document.getElementById('forgot-modal');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
  }

  function solicitarCodigoRecuperacao() {
    var input = document.getElementById('forgot-identificador');
    var emailVal = input ? input.value.trim() : '';
    if (!emailVal || !emailVal.includes('@') || !emailVal.includes('.')) {
      showToast('⚠ Informe um endereço de e-mail válido.');
      if (input) input.focus();
      return;
    }

    var btn = document.getElementById('btn-send-code');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Enviando código...';
    }

    showToast('Enviando código para seu e-mail...');

    window.apiFetch('api/auth/forgot_password.php', {
      method: 'POST',
      body: {
        email: emailVal,
        identificador: emailVal,
        metodo: 'email'
      }
    }).then(function (res) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '→ Enviar Código por E-mail';
      }

      if (res && res.success) {
        lastSentIdentificador = res.identificador || emailVal;
        showToast('✓ ' + (res.message || 'Código enviado com sucesso!'));

        var step1 = document.getElementById('forgot-step-1');
        var step2 = document.getElementById('forgot-step-2');
        var msgEl = document.getElementById('forgot-sent-msg');
        var codeInput = document.getElementById('forgot-code');

        if (msgEl) {
          var htmlMsg = 'Código de 6 dígitos enviado para <strong>' + (res.destino_mascarado || emailVal) + '</strong>.';
          if (res.preview_codigo) {
            htmlMsg += '<div style="margin-top:6px;"><small style="color:#52d67b;font-weight:600;">Código de verificação: ' + res.preview_codigo + '</small></div>';
          }
          msgEl.innerHTML = htmlMsg;
        }

        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        if (codeInput) {
          codeInput.value = res.preview_codigo || '';
          setTimeout(function () { codeInput.focus(); }, 150);
        }
      } else {
        showToast('⚠ ' + (res.error || 'Não foi possível enviar o código para este e-mail.'));
      }
    }).catch(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '→ Enviar Código por E-mail';
      }
      showToast('⚠ Falha de comunicação com o servidor.');
    });
  }

  function voltarPasso1Recuperacao() {
    var step1 = document.getElementById('forgot-step-1');
    var step2 = document.getElementById('forgot-step-2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
  }

  function confirmarRedefinicaoSenha() {
    var codeInput = document.getElementById('forgot-code');
    var newPwdInput = document.getElementById('forgot-new-pwd');
    var newPwdConfInput = document.getElementById('forgot-new-pwd-conf');

    var code = codeInput ? codeInput.value.trim() : '';
    var newPwd = newPwdInput ? newPwdInput.value : '';
    var newPwdConf = newPwdConfInput ? newPwdConfInput.value : '';

    if (!code || code.length !== 6) {
      showToast('⚠ Digite o código de 6 dígitos recebido.');
      if (codeInput) codeInput.focus();
      return;
    }
    if (newPwd.length < 6) {
      showToast('⚠ A nova senha deve possuir ao menos 6 caracteres.');
      if (newPwdInput) newPwdInput.focus();
      return;
    }
    if (newPwd !== newPwdConf) {
      showToast('⚠ A confirmação de senha não coincide com a nova senha.');
      if (newPwdConfInput) newPwdConfInput.focus();
      return;
    }

    var btn = document.getElementById('btn-confirm-reset');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Redefinindo...';
    }

    showToast('Atualizando sua senha...');

    var targetEmail = lastSentIdentificador || (document.getElementById('forgot-identificador') ? document.getElementById('forgot-identificador').value.trim() : '') || (emailInput ? emailInput.value.trim() : '');

    window.apiFetch('api/auth/reset_password.php', {
      method: 'POST',
      body: {
        identificador: targetEmail,
        email: targetEmail,
        codigo: code,
        nova_senha: newPwd
      }
    }).then(function (res) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✓ Redefinir Senha';
      }
      if (res && res.success) {
        showToast('✓ ' + (res.message || 'Senha redefinida com sucesso!'));
        closeForgotModal();
        if (emailInput && lastSentIdentificador.includes('@')) {
          emailInput.value = lastSentIdentificador;
        }
        if (pwdInput) {
          pwdInput.value = newPwd;
          pwdInput.focus();
        }
      } else {
        showToast('⚠ ' + (res.error || 'Código incorreto ou expirado.'));
      }
    }).catch(function () {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✓ Redefinir Senha';
      }
      showToast('⚠ Erro de conexão com o servidor.');
    });
  }

  /* ==========================================================================
     MODAL DE REENVIO DE ATIVAÇÃO DE CONTA
     ========================================================================== */
  function openResendModal(email, linkAtivacao) {
    var overlay = document.getElementById('resend-overlay');
    var modal = document.getElementById('resend-modal');
    var rEmailInput = document.getElementById('resend-email-input');
    var previewBox = document.getElementById('resend-preview-box');

    if (rEmailInput && email) rEmailInput.value = email;
    if (previewBox) {
      if (linkAtivacao) {
        previewBox.style.display = 'block';
        previewBox.innerHTML = '<strong>💡 Ambiente Local / Testes:</strong><br>' +
          '<span style="font-size:0.8rem;color:#a3c4b0;">Sua conta precisa de ativação para liberar o login:</span><br><br>' +
          '<a href="' + linkAtivacao + '" style="display:inline-block;padding:8px 14px;background:#52d67b;color:#0b1d14;font-weight:700;border-radius:8px;text-decoration:none;text-align:center;width:100%;box-sizing:border-box;">🔗 Ativar Minha Conta Imediatamente</a>';
      } else {
        previewBox.style.display = 'none';
      }
    }

    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');
  }

  function closeResendModal() {
    var overlay = document.getElementById('resend-overlay');
    var modal = document.getElementById('resend-modal');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
  }

  function reenviarLinkAtivacao() {
    var input = document.getElementById('resend-email-input');
    var previewBox = document.getElementById('resend-preview-box');
    var email = input ? input.value.trim() : '';

    if (!email || !email.includes('@')) {
      showToast('⚠ Digite um e-mail válido.');
      return;
    }

    var btn = document.getElementById('btn-resend-act');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Reenviando...';
    }

    window.apiFetch('api/auth/resend_activation.php', {
      method: 'POST',
      body: { email: email }
    }).then(function (res) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '→ Reenviar Link de Ativação';
      }
      if (res && res.success) {
        showToast('✓ ' + (res.message || 'Link de ativação reenviado com sucesso!'), 5000);
        if (res.link_ativacao && previewBox) {
          previewBox.style.display = 'block';
          previewBox.innerHTML = '<strong>💡 Link Gerado com Sucesso:</strong><br><br>' +
            '<a href="' + res.link_ativacao + '" style="display:inline-block;padding:8px 14px;background:#52d67b;color:#0b1d14;font-weight:700;border-radius:8px;text-decoration:none;text-align:center;width:100%;box-sizing:border-box;">🔗 Clique Aqui para Ativar Sua Conta</a>';
        } else {
          closeResendModal();
        }
      } else {
        showToast('⚠ ' + (res.error || 'Erro ao reenviar link.'));
      }
    }).catch(function () {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '→ Reenviar Link de Ativação';
      }
      showToast('⚠ Falha de conexão com o servidor.');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loginBtn   = document.getElementById('loginBtn');
    emailInput = document.getElementById('email');
    pwdInput   = document.getElementById('password');
    toastEl    = document.getElementById('toast');
    toastMsg   = document.getElementById('toastMsg') || document.getElementById('tmsg');
    togglePwd  = document.getElementById('togglePwd');

    if (togglePwd) togglePwd.addEventListener('click', handleTogglePwd);
    if (loginBtn)  loginBtn.addEventListener('click', handleLogin);

    var forgotInput = document.getElementById('forgot-identificador');
    if (forgotInput) {
      forgotInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          solicitarCodigoRecuperacao();
        }
      });
    }

    var forgotCode = document.getElementById('forgot-code');
    if (forgotCode) {
      forgotCode.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 6);
      });
    }

    var forgotNewPwd = document.getElementById('forgot-new-pwd');
    var forgotNewPwdConf = document.getElementById('forgot-new-pwd-conf');
    if (forgotNewPwdConf) {
      forgotNewPwdConf.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmarRedefinicaoSenha();
        }
      });
    }

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
  window.openForgotModal = openForgotModal;
  window.closeForgotModal = closeForgotModal;
  window.solicitarCodigoRecuperacao = solicitarCodigoRecuperacao;
  window.voltarPasso1Recuperacao = voltarPasso1Recuperacao;
  window.confirmarRedefinicaoSenha = confirmarRedefinicaoSenha;
  window.openResendModal = openResendModal;
  window.closeResendModal = closeResendModal;
  window.reenviarLinkAtivacao = reenviarLinkAtivacao;
})();
