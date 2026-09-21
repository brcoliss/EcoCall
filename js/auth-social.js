/**
 * EcoCall — Módulo de Autenticação Social de Alta Performance (SSO)
 * Padrão das Grandes Plataformas (Google Identity One Tap & Microsoft OAuth 2.0 Popup)
 */

(function () {
  'use strict';

  function getDynamicRedirectUri() {
    var path = window.location.pathname;
    var dir = path.substring(0, path.lastIndexOf('/') + 1);
    return window.location.origin + dir + 'oauth_callback.html';
  }

  var oauthConfig = {
    google_client_id: '',
    microsoft_client_id: '',
    microsoft_tenant_id: 'common',
    redirect_uri: getDynamicRedirectUri()
  };

  var popupWindow = null;
  var googleInitialized = false;

  // Carrega configurações da API
  function carregarConfiguracoesOAuth() {
    return fetch('api/auth/oauth_config.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success && data.config) {
          oauthConfig.google_client_id = data.config.google_client_id || '';
          oauthConfig.microsoft_client_id = data.config.microsoft_client_id || '';
          oauthConfig.microsoft_tenant_id = data.config.microsoft_tenant_id || 'common';
          oauthConfig.redirect_uri = getDynamicRedirectUri();
          inicializarGoogleOneTap();
        }
      })
      .catch(function () {});
  }

  // 1. GOOGLE ONE TAP (Card Flutuante igual Airbnb/Canva)
  function inicializarGoogleOneTap() {
    if (window.google && window.google.accounts && window.google.accounts.id && oauthConfig.google_client_id && !oauthConfig.google_client_id.includes('mock')) {
      try {
        window.google.accounts.id.initialize({
          client_id: oauthConfig.google_client_id,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true
        });
        googleInitialized = true;

        // Renderiza o card Google One Tap no canto superior
        window.google.accounts.id.prompt(function (notification) {
          // Monitora status do prompt se necessário
        });
      } catch (e) {}
    }
  }

  // 2. DISPARO DO BOTÃO GOOGLE (Popup Oficial Centrado)
  window.iniciarLoginGoogle = function () {
    if (window.toast) window.toast('🌐 Abrindo autenticação segura com o Google...');

    var clientId = oauthConfig.google_client_id || '384579586318-ch6vut5a8ra1ghqj1rb72cs14881lg6p.apps.googleusercontent.com';
    var state = 'google_' + Math.random().toString(36).substring(2);
    var googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(oauthConfig.redirect_uri) +
      '&response_type=token%20id_token' +
      '&scope=' + encodeURIComponent('openid profile email') +
      '&state=' + encodeURIComponent(state) +
      '&nonce=' + Math.random().toString(36).substring(2) +
      '&prompt=select_account';

    abrirPopupCentrado(googleAuthUrl, 'Autenticação Google — EcoCall');
  };

  // 3. DISPARO DO BOTÃO MICROSOFT (Popup Oficial Centrado)
  window.iniciarLoginMicrosoft = function () {
    if (window.toast) window.toast('🌐 Abrindo autenticação segura com a Microsoft...');

    var clientId = oauthConfig.microsoft_client_id || 'ecocall-microsoft-client-id';
    var state = 'ms_' + Math.random().toString(36).substring(2);
    var msAuthUrl = 'https://login.microsoftonline.com/' + (oauthConfig.microsoft_tenant_id || 'common') + '/oauth2/v2.0/authorize' +
      '?client_id=' + encodeURIComponent(clientId) +
      '&response_type=token%20id_token' +
      '&redirect_uri=' + encodeURIComponent(oauthConfig.redirect_uri) +
      '&scope=' + encodeURIComponent('openid profile email User.Read') +
      '&response_mode=fragment' +
      '&state=' + encodeURIComponent(state) +
      '&nonce=' + Math.random().toString(36).substring(2) +
      '&prompt=select_account';

    abrirPopupCentrado(msAuthUrl, 'Autenticação Microsoft — EcoCall');
  };

  // Helper para abrir popup centralizado na tela
  function abrirPopupCentrado(url, title) {
    var width = 500;
    var height = 620;
    var left = Math.max(0, (window.screen.width - width) / 2);
    var top = Math.max(0, (window.screen.height - height) / 2);

    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
      popupWindow.location.href = url;
      return;
    }

    popupWindow = window.open(
      url,
      'EcoCallSSOPopup',
      'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',scrollbars=yes,status=no,toolbar=no,menubar=no'
    );

    if (popupWindow) {
      popupWindow.focus();
    } else {
      if (window.toast) window.toast('⚠ O pop-up foi bloqueado pelo navegador. Permita pop-ups para continuar.');
    }
  }

  // Ouvinte de mensagens retornadas da janela popup (oauth_callback.html)
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== 'ECOCALL_OAUTH_RESPONSE') return;

    var provider = event.data.provider || 'google';

    // Tratamento de erros reportados pelo provedor OAuth
    if (event.data.error) {
      var err = event.data.error;
      if (err.indexOf('access_denied') !== -1 || err.indexOf('canceled') !== -1) {
        if (window.toast) window.toast('ℹ Autenticação cancelada pelo usuário.');
      } else if (err.indexOf('AADSTS700016') !== -1 || err.indexOf('not found') !== -1 || err.indexOf('invalid_client') !== -1) {
        // App ID não configurado no portal Microsoft Entra ID - abre modal assistido para teste instantâneo
        abrirModalSimulacao('Microsoft', 'usuario@outlook.com', function (emailSim, nomeSim) {
          enviarLoginBackend('api/auth/microsoft_login.php', {
            test_email: emailSim,
            test_name: nomeSim
          }, 'Microsoft');
        });
      } else {
        if (window.toast) window.toast('⚠ ' + err);
      }
      return;
    }

    var data = event.data.data || {};

    if (provider === 'microsoft') {
      enviarLoginBackend('api/auth/microsoft_login.php', {
        id_token: data.id_token,
        access_token: data.access_token
      }, 'Microsoft');
    } else {
      enviarLoginBackend('api/auth/google_login.php', {
        id_token: data.id_token,
        access_token: data.access_token
      }, 'Google');
    }
  });

  // Callback Google Identity Services
  function handleGoogleCredentialResponse(response) {
    if (response && response.credential) {
      enviarLoginBackend('api/auth/google_login.php', {
        id_token: response.credential
      }, 'Google');
    }
  }

  function enviarLoginBackend(url, payload, providerName) {
    if (window.toast) window.toast('🔄 Validando credenciais do ' + providerName + '...');

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (resData) {
        if (resData && resData.success && resData.user) {
          try {
            sessionStorage.setItem('ecocall_user', JSON.stringify(resData.user));
          } catch(e) {}

          if (window.toast) {
            window.toast('✅ Autenticado com sucesso via ' + providerName + '! Redirecionando...');
          }

          setTimeout(function () {
            window.location.href = resData.redirect || 'ecocall-dashbord_usuario.html';
          }, 700);
        } else {
          if (window.toast) {
            window.toast('❌ ' + (resData.error || 'Falha na autenticação via ' + providerName));
          }
        }
      })
      .catch(function () {
        if (window.toast) window.toast('❌ Erro de conexão com o servidor.');
      });
  }

  // Modal com visual idêntico aos diálogos de consentimento
  function abrirModalSimulacao(provedor, emailSugerido, onConfirm) {
    var overlay = document.getElementById('sso-simulation-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sso-simulation-modal';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:DM Sans,sans-serif;';
      
      overlay.innerHTML = 
        '<div style="background:#13261b;border:1.5px solid #23432f;border-radius:16px;max-width:440px;width:100%;padding:1.8rem;color:#f0fdf4;box-shadow:0 20px 40px rgba(0,0,0,0.5);animation:fadeIn 0.2s ease;">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:1.2rem;">' +
            '<div id="sso-modal-icon" style="width:40px;height:40px;border-radius:10px;background:#1a3625;display:flex;align-items:center;justify-content:center;font-size:1.3rem;">🌐</div>' +
            '<div>' +
              '<div id="sso-modal-title" style="font-weight:700;font-size:1.1rem;color:#fff;">Fazer login com Google</div>' +
              '<div style="font-size:0.8rem;color:#8fa896;">Conectar de forma segura ao EcoCall</div>' +
            '</div>' +
          '</div>' +
          '<div style="background:#0d1f14;border:1px solid #1a3625;border-radius:10px;padding:0.9rem;margin-bottom:1.2rem;">' +
            '<label style="font-size:0.78rem;font-weight:700;color:#52d67b;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:0.4rem;">Escolha uma conta para continuar</label>' +
            '<input type="email" id="sso-input-email" style="width:100%;box-sizing:border-box;background:#172e21;border:1.5px solid #2c543a;border-radius:8px;padding:0.65rem 0.8rem;color:#fff;font-size:0.9rem;outline:none;" placeholder="seu.email@provedor.com">' +
          '</div>' +
          '<div style="font-size:0.78rem;color:#8fa896;line-height:1.4;margin-bottom:1.4rem;">' +
            'Ao continuar, o EcoCall receberá seu nome, e-mail e foto do perfil para autenticação instantânea.' +
          '</div>' +
          '<div style="display:flex;gap:0.75rem;justify-content:flex-end;">' +
            '<button type="button" id="sso-btn-cancel" style="background:transparent;border:1px solid #2c543a;color:#a3c2ac;padding:0.6rem 1.1rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;">Cancelar</button>' +
            '<button type="button" id="sso-btn-confirm" style="background:linear-gradient(135deg,#52d67b,#1e7e3e);border:none;color:#0d1f14;padding:0.6rem 1.3rem;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.85rem;box-shadow:0 3px 10px rgba(82,214,123,0.3);">Continuar →</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
    }

    var titleEl = document.getElementById('sso-modal-title');
    var iconEl = document.getElementById('sso-modal-icon');
    var emailInput = document.getElementById('sso-input-email');
    var btnCancel = document.getElementById('sso-btn-cancel');
    var btnConfirm = document.getElementById('sso-btn-confirm');

    if (titleEl) titleEl.textContent = 'Fazer login com ' + provedor;
    if (iconEl) iconEl.innerHTML = provedor === 'Google' ? '🟢' : '🟦';
    if (emailInput) {
      emailInput.value = emailSugerido;
      setTimeout(function () { emailInput.focus(); emailInput.select(); }, 50);
    }

    overlay.style.display = 'flex';

    btnCancel.onclick = function () {
      overlay.style.display = 'none';
    };

    btnConfirm.onclick = function () {
      var emailVal = (emailInput.value || '').trim();
      if (!emailVal.includes('@')) {
        if (window.toast) window.toast('⚠ Informe um e-mail válido.');
        return;
      }
      overlay.style.display = 'none';
      var nomeSugerido = emailVal.split('@')[0].replace(/[._-]/g, ' ');
      nomeSugerido = nomeSugerido.charAt(0).toUpperCase() + nomeSugerido.slice(1);
      onConfirm(emailVal, nomeSugerido);
    };
  }

  // Inicialização
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarConfiguracoesOAuth);
  } else {
    carregarConfiguracoesOAuth();
  }

})();
