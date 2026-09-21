<?php
/* ==========================================================================
   EcoCall — Endpoint: Obter Configurações Públicas de OAuth (GET /api/auth/oauth_config.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/oauth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

sendJsonResponse([
    'success' => true,
    'config' => getOAuthPublicConfig()
]);
