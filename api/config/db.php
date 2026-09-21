<?php
/* ==========================================================================
   EcoCall — Módulo de Conexão com Banco de Dados (MySQL PDO)
   ========================================================================== */

if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

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
        
        // Auto-migrações e autocorreções de esquema seguras
        try {
            $pdo->exec("ALTER TABLE coletas ADD COLUMN protocolo VARCHAR(30) DEFAULT NULL");
        } catch (Exception $ex) {}

        try { $pdo->exec("ALTER TABLE usuarios ADD COLUMN status_conta ENUM('pendente_ativacao', 'ativo', 'bloqueado') NOT NULL DEFAULT 'ativo'"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE usuarios ADD COLUMN email_verificado TINYINT(1) NOT NULL DEFAULT 1"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE usuarios ADD COLUMN token_ativacao VARCHAR(64) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE usuarios ADD COLUMN token_ativacao_expira DATETIME DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(100) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE usuarios ADD COLUMN microsoft_id VARCHAR(100) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE usuarios ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL"); } catch (Exception $ex) {}

        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN status_conta ENUM('pendente_ativacao', 'ativo', 'bloqueado') NOT NULL DEFAULT 'ativo'"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN email_verificado TINYINT(1) NOT NULL DEFAULT 1"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN token_ativacao VARCHAR(64) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN token_ativacao_expira DATETIME DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN google_id VARCHAR(100) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN microsoft_id VARCHAR(100) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN lat DECIMAL(10,8) DEFAULT NULL"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE empresas ADD COLUMN lng DECIMAL(11,8) DEFAULT NULL"); } catch (Exception $ex) {}

        try {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS password_resets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    conta_id INT DEFAULT NULL,
                    identificador VARCHAR(150) NOT NULL,
                    metodo ENUM('email', 'whatsapp', 'sms') NOT NULL DEFAULT 'email',
                    codigo VARCHAR(10) NOT NULL,
                    tipo_conta ENUM('user', 'empresa') NOT NULL DEFAULT 'user',
                    utilizado TINYINT(1) NOT NULL DEFAULT 0,
                    expira_em DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
            $pdo->exec("ALTER TABLE password_resets ADD COLUMN conta_id INT DEFAULT NULL");
            $pdo->exec("ALTER TABLE password_resets MODIFY COLUMN metodo ENUM('email', 'whatsapp', 'sms') NOT NULL DEFAULT 'email'");
        } catch (Exception $ex) {}

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

/**
 * Validação rigorosa de e-mails reais e existentes (Anti-bot e anti-descartáveis)
 */
function validarEmailReal($email) {
    $email = trim($email);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['valido' => false, 'motivo' => 'Formato de e-mail inválido.'];
    }

    $partes = explode('@', $email);
    if (count($partes) !== 2) {
        return ['valido' => false, 'motivo' => 'Formato de e-mail inválido.'];
    }

    $dominio = strtolower(trim($partes[1]));

    // Lista negra de domínios descartáveis e fictícios
    $disposableDomains = [
        'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'yopmail.com', 'trashmail.com', 'sharklasers.com', 'dispostable.com',
        'getairmail.com', 'mytemp.email', 'fake.com', 'teste.com', 'teste.com.br',
        'exemplo.com', 'example.com', 'asdf.com', 'test.com', 'xyz.com'
    ];

    if (in_array($dominio, $disposableDomains, true)) {
        return ['valido' => false, 'motivo' => 'E-mails temporários, descartáveis ou fictícios não são permitidos por motivos de segurança.'];
    }

    // Lista de domínios conhecidos para validação instantânea sem espera de DNS
    $trustedDomains = [
        'ecocall.com', 'senacsp.edu.br', 'senac.br', 'gmail.com', 'hotmail.com',
        'outlook.com', 'yahoo.com', 'yahoo.com.br', 'live.com', 'icloud.com',
        'uol.com.br', 'bol.com.br', 'terra.com.br', 'santistaambiental.com.br',
        'terrasantos.com.br', 'localhost'
    ];
    if (in_array($dominio, $trustedDomains, true)) {
        return ['valido' => true];
    }

    if (function_exists('checkdnsrr')) {
        $hasMx = @checkdnsrr($dominio, 'MX');
        $hasA  = @checkdnsrr($dominio, 'A');
        if (!$hasMx && !$hasA) {
            return ['valido' => false, 'motivo' => 'O domínio do e-mail informado (@' . $dominio . ') não possui servidores válidos de e-mail na internet.'];
        }
    }

    return ['valido' => true];
}

function sendJsonResponse($data, $statusCode = 200) {
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }
    if (!headers_sent()) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function checkAuthSession() {
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        session_start();
    }
    if (!isset($_SESSION['user_id'])) {
        sendJsonResponse(['error' => 'Não autorizado. Faça login para continuar.'], 401);
    }
    return $_SESSION;
}
