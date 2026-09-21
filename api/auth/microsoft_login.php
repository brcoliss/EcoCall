<?php
/* ==========================================================================
   EcoCall — Endpoint: Login / Cadastro Direto com Microsoft (POST /api/auth/microsoft_login.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/oauth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$accessToken = trim($data['access_token'] ?? '');
$idToken = trim($data['id_token'] ?? '');
$testEmail = trim($data['test_email'] ?? '');
$testName = trim($data['test_name'] ?? '');

$microsoftSub = null;
$email = null;
$nome = null;
$picture = null;

if (!empty($accessToken)) {
    // 1. Consulta o perfil do usuário diretamente na API Microsoft Graph oficial
    $graphUrl = 'https://graph.microsoft.com/v1.0/me';
    $ctx = stream_context_create([
        'http' => [
            'header' => "Authorization: Bearer " . $accessToken . "\r\nUser-Agent: EcoCall-OAuth\r\n",
            'timeout' => 8,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);

    $response = @file_get_contents($graphUrl, false, $ctx);
    if ($response !== false) {
        $me = json_decode($response, true);
        if (!empty($me['id'])) {
            $microsoftSub = $me['id'];
            $email = strtolower(trim($me['mail'] ?? $me['userPrincipalName'] ?? ''));
            $nome = trim($me['displayName'] ?? 'Usuário Microsoft');
        }
    }

    // Tenta buscar a foto de perfil do usuário no Microsoft Graph se disponível
    if (!empty($microsoftSub)) {
        $photoUrl = 'https://graph.microsoft.com/v1.0/me/photo/$value';
        $photoResp = @file_get_contents($photoUrl, false, $ctx);
        if ($photoResp !== false && strlen($photoResp) > 100) {
            $uploadDir = __DIR__ . '/../../uploads/avatars/';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0755, true);
            }
            $filename = 'avatar_ms_' . md5($email) . '_' . time() . '.jpg';
            if (@file_put_contents($uploadDir . $filename, $photoResp)) {
                $picture = 'uploads/avatars/' . $filename;
            }
        }
    }
}

// Fallback por ID Token JWT (MSAL)
if (empty($email) && !empty($idToken) && substr_count($idToken, '.') === 2) {
    $parts = explode('.', $idToken);
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if ($payload && (!empty($payload['preferred_username']) || !empty($payload['email']) || !empty($payload['upn']))) {
        $microsoftSub = $payload['oid'] ?? $payload['sub'] ?? ('ms_' . time());
        $email = strtolower(trim($payload['preferred_username'] ?? $payload['email'] ?? $payload['upn']));
        $nome = trim($payload['name'] ?? 'Usuário Microsoft');
    }
}

// Fallback para modo de teste/demo local
if (empty($email) && !empty($testEmail)) {
    $email = strtolower(trim($testEmail));
    $nome = !empty($testName) ? trim($testName) : 'Usuário Microsoft Teste';
    $microsoftSub = 'ms_test_' . md5($email);
}

if (empty($email)) {
    sendJsonResponse(['error' => 'Não foi possível validar a conta Microsoft. Tente novamente.'], 400);
}

$pdo = getDBConnection();

// 2. Verifica se o usuário já existe
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = :email OR microsoft_id = :mid LIMIT 1");
$stmt->execute([':email' => $email, ':mid' => $microsoftSub]);
$user = $stmt->fetch();

if ($user) {
    // Atualiza microsoft_id, avatar e garante ativação
    $stmtUp = $pdo->prepare("
        UPDATE usuarios 
        SET microsoft_id = COALESCE(microsoft_id, :mid),
            avatar_url = COALESCE(avatar_url, :avatar),
            status_conta = 'ativo',
            email_verificado = 1
        WHERE id = :id
    ");
    $stmtUp->execute([
        ':mid' => $microsoftSub,
        ':avatar' => $picture,
        ':id' => $user['id']
    ]);

    $stmtReload = $pdo->prepare("SELECT * FROM usuarios WHERE id = :id");
    $stmtReload->execute([':id' => $user['id']]);
    $user = $stmtReload->fetch();
} else {
    // Cria novo usuário cidadão ativo
    $senhaHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
    
    $stmtIns = $pdo->prepare("
        INSERT INTO usuarios (nome, email, senha, tipo, pontos, status_conta, email_verificado, microsoft_id, avatar_url, cidade, uf)
        VALUES (:nome, :email, :senha, 'user', 50, 'ativo', 1, :mid, :avatar, 'Santos', 'SP')
    ");
    $stmtIns->execute([
        ':nome' => $nome,
        ':email' => $email,
        ':senha' => $senhaHash,
        ':mid' => $microsoftSub,
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
$_SESSION['avatar_url'] = $user['avatar_url'] ?? $picture ?? null;
unset($_SESSION['empresa_id']);

sendJsonResponse([
    'success' => true,
    'message' => 'Autenticado com sucesso via Microsoft!',
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

