<?php
/* ==========================================================================
   EcoCall — Endpoint API: Logout (POST /api/auth/logout.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();

sendJsonResponse([
    'success' => true,
    'authenticated' => false,
    'message' => 'Sessão encerrada com sucesso.',
    'redirect' => 'ecocall-home.html'
]);
