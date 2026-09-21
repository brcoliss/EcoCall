<?php
/* ==========================================================================
   EcoCall — Configuração de Provedores OAuth (Google & Microsoft SSO)
   ========================================================================== */

if (!defined('GOOGLE_CLIENT_ID')) {
    define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '384579586318-ch6vut5a8ra1ghqj1rb72cs14881lg6p.apps.googleusercontent.com');
}

if (!defined('MICROSOFT_CLIENT_ID')) {
    // Insira seu Application (Client) ID do Microsoft Entra ID (Azure Portal) aqui:
    // Exemplo: '87654321-4321-4321-4321-210987654321'
    define('MICROSOFT_CLIENT_ID', getenv('MICROSOFT_CLIENT_ID') ?: 'ecocall-microsoft-client-id');
}

if (!defined('MICROSOFT_TENANT_ID')) {
    // 'common' para contas pessoais (Outlook/Hotmail) e corporativas/estudantis (ex: Senac/Office365)
    define('MICROSOFT_TENANT_ID', getenv('MICROSOFT_TENANT_ID') ?: 'common');
}

function getOAuthPublicConfig() {
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    
    // Resolve caminho base para a raiz do projeto EcoCall
    $basePath = '/EcoCall';
    if (!empty($_SERVER['SCRIPT_NAME'])) {
        $scriptPath = str_replace('\\', '/', $_SERVER['SCRIPT_NAME']);
        $pos = strpos($scriptPath, '/api/');
        if ($pos !== false) {
            $basePath = substr($scriptPath, 0, $pos);
        } else {
            $candidate = dirname($scriptPath);
            if (!empty($candidate) && $candidate !== '/' && strpos($candidate, ':') === false) {
                $basePath = rtrim($candidate, '/');
            }
        }
    }
    if (empty($basePath)) {
        $basePath = '/EcoCall';
    }
    
    return [
        'google_client_id' => GOOGLE_CLIENT_ID,
        'microsoft_client_id' => MICROSOFT_CLIENT_ID,
        'microsoft_tenant_id' => MICROSOFT_TENANT_ID,
        'redirect_uri' => $proto . $host . $basePath . '/oauth_callback.html'
    ];
}
