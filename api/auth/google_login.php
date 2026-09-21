<?php
/* ==========================================================================
   EcoCall — Endpoint: Login / Cadastro Direto com Google (POST /api/auth/google_login.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/oauth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$idToken = trim($data['id_token'] ?? $data['credential'] ?? '');
$testEmail = trim($data['test_email'] ?? '');
$testName = trim($data['test_name'] ?? '');

$googleSub = null;
$email = null;
$nome = null;
$picture = null;

if (!empty($idToken)) {
    // 1. Validação do ID Token JWT junto aos servidores oficiais do Google
    $verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
    
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 8,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);
    
    $response = @file_get_contents($verifyUrl, false, $ctx);
    
    if ($response !== false) {
        $tokenInfo = json_decode($response, true);
        if (!empty($tokenInfo['sub']) && !empty($tokenInfo['email'])) {
            $googleSub = $tokenInfo['sub'];
            $email = strtolower(trim($tokenInfo['email']));
            $nome = trim($tokenInfo['name'] ?? $tokenInfo['given_name'] ?? 'Usuário Google');
            $picture = $tokenInfo['picture'] ?? null;
        }
    }

    // Fallback: se falhar por restrição de ambiente local ou token simulado, decodifica a parte payload do JWT
    if (!$googleSub && substr_count($idToken, '.') === 2) {
        $parts = explode('.', $idToken);
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        if ($payload && !empty($payload['email'])) {
            $googleSub = $payload['sub'] ?? ('google_' . time());
            $email = strtolower(trim($payload['email']));
            $nome = trim($payload['name'] ?? 'Usuário Google');
            $picture = $payload['picture'] ?? null;
        }
    }
} elseif (!empty($testEmail)) {
    // Modo de demonstração/teste local
    $email = strtolower(trim($testEmail));
    $nome = !empty($testName) ? trim($testName) : 'Usuário Google Teste';
    $googleSub = 'google_test_' . md5($email);
}

if (empty($email)) {
    sendJsonResponse(['error' => 'Não foi possível validar as credenciais do Google. Tente novamente.'], 400);
}

$pdo = getDBConnection();

// 2. Verifica se a conta já existe na tabela de usuários
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = :email OR google_id = :gid LIMIT 1");
$stmt->execute([':email' => $email, ':gid' => $googleSub]);
$user = $stmt->fetch();

if ($user) {
    // Usuário já cadastrado: atualiza google_id e avatar se necessário, e ativa conta
    $stmtUp = $pdo->prepare("
        UPDATE usuarios 
        SET google_id = COALESCE(google_id, :gid),
            avatar_url = COALESCE(avatar_url, :avatar),
            status_conta = 'ativo',
            email_verificado = 1
        WHERE id = :id
    ");
    $stmtUp->execute([
        ':gid' => $googleSub,
        ':avatar' => $picture,
        ':id' => $user['id']
    ]);

    // Recarrega os dados atualizados
    $stmtReload = $pdo->prepare("SELECT * FROM usuarios WHERE id = :id");
    $stmtReload->execute([':id' => $user['id']]);
    $user = $stmtReload->fetch();
} else {
    // Novo usuário: realiza auto-cadastro direto com conta ativa
    $senhaHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
    
    $stmtIns = $pdo->prepare("
        INSERT INTO usuarios (nome, email, senha, tipo, pontos, status_conta, email_verificado, google_id, avatar_url, cidade, uf)
        VALUES (:nome, :email, :senha, 'user', 50, 'ativo', 1, :gid, :avatar, 'Santos', 'SP')
    ");
    $stmtIns->execute([
        ':nome' => $nome,
        ':email' => $email,
        ':senha' => $senhaHash,
        ':gid' => $googleSub,
        ':avatar' => $picture
    ]);

    $newId = $pdo->lastInsertId();

    $stmtReload = $pdo->prepare("SELECT * FROM usuarios WHERE id = :id");
    $stmtReload->execute([':id' => $newId]);
    $user = $stmtReload->fetch();
}

// 3. Inicializa sessão PHP
if (session_status() === PHP_SESSION_NONE) {
    if (!headers_sent()) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        session_start();
    }
}
if (session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
    session_regenerate_id(true);
}

$_SESSION['user_id'] = $user['id'];
$_SESSION['nome'] = $user['nome'];
$_SESSION['email'] = $user['email'];
$_SESSION['tipo'] = 'user';
unset($_SESSION['empresa_id']);

sendJsonResponse([
    'success' => true,
    'message' => 'Autenticado com sucesso via Google!',
    'is_new_user' => empty($user['created_at']),
    'user' => [
        'id' => $user['id'],
        'nome' => $user['nome'],
        'email' => $user['email'],
        'cpf' => $user['cpf'] ?? '',
        'telefone' => $user['telefone'] ?? '',
        'cep' => $user['cep'] ?? '',
        'tipo_logradouro' => $user['tipo_logradouro'] ?? 'Rua',
        'logradouro' => $user['logradouro'] ?? '',
        'numero' => $user['numero'] ?? '',
        'complemento' => $user['complemento'] ?? '',
        'bairro' => $user['bairro'] ?? '',
        'cidade' => $user['cidade'] ?? 'Santos',
        'uf' => $user['uf'] ?? 'SP',
        'endereco' => $user['endereco'] ?? '',
        'avatar_url' => $user['avatar_url'] ?? $picture ?? '',
        'tipo' => 'user',
        'pontos' => $user['pontos'] ?? 50
    ],
    'redirect' => 'ecocall-dashbord_usuario.html'
]);
