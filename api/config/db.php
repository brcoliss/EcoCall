<?php
/* ==========================================================================
   EcoCall — Módulo de Conexão com Banco de Dados (MySQL PDO)
   ========================================================================== */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'ecocall_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_PORT', '3306');

function getDBConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        // Tenta conexão direta com a base de dados
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // Se a base de dados não existir (erro 1049 em MySQL), tenta criar automaticamente
        if ($e->getCode() == 1049) {
            try {
                $dsnNoDb = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
                $pdoRoot = new PDO($dsnNoDb, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $pdoRoot->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                
                // Reconecta com a base recém criada
                $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                return $pdo;
            } catch (PDOException $ex) {
                sendJsonResponse(['error' => 'Falha ao criar o banco de dados MySQL: ' . $ex->getMessage()], 500);
                exit;
            }
        }
        sendJsonResponse(['error' => 'Erro de conexão com o MySQL: ' . $e->getMessage()], 500);
        exit;
    }
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function checkAuthSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (!isset($_SESSION['user_id'])) {
        sendJsonResponse(['error' => 'Não autorizado. Faça login para continuar.'], 401);
    }
    return $_SESSION;
}
