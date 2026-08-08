<?php
/* ==========================================================================
   EcoCall — Endpoint API: Login (POST /api/auth/login.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

// Ler dados recebidos (JSON ou Form-Data)
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$email = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$senha = $data['password'] ?? $data['senha'] ?? '';

if (!$email || empty($senha)) {
    sendJsonResponse(['error' => 'Por favor, informe um e-mail válido e a senha.'], 400);
}

$pdo = getDBConnection();

// 1. Tenta buscar em usuários cidadãos
$stmt = $pdo->prepare("SELECT id, nome, email, senha, pontos FROM usuarios WHERE email = :email");
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if ($user && password_verify($senha, $user['senha'])) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['nome'] = $user['nome'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['tipo'] = 'user';

    sendJsonResponse([
        'success' => true,
        'message' => 'Login de usuário realizado com sucesso!',
        'user' => [
            'id' => $user['id'],
            'nome' => $user['nome'],
            'email' => $user['email'],
            'tipo' => 'user',
            'pontos' => $user['pontos'],
            'empresa_id' => null
        ],
        'redirect' => 'ecocall-dashbord_usuario.html'
    ]);
}

// 2. Tenta buscar na tabela dedicada de empresas
$stmtEmp = $pdo->prepare("SELECT id, razao_social, cnpj, email, senha FROM empresas WHERE email = :email");
$stmtEmp->execute([':email' => $email]);
$empresa = $stmtEmp->fetch();

if ($empresa && password_verify($senha, $empresa['senha'])) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['user_id'] = $empresa['id'];
    $_SESSION['empresa_id'] = $empresa['id'];
    $_SESSION['nome'] = $empresa['razao_social'];
    $_SESSION['email'] = $empresa['email'];
    $_SESSION['tipo'] = 'empresa';

    sendJsonResponse([
        'success' => true,
        'message' => 'Login de empresa realizado com sucesso!',
        'user' => [
            'id' => $empresa['id'],
            'nome' => $empresa['razao_social'],
            'cnpj' => $empresa['cnpj'],
            'email' => $empresa['email'],
            'tipo' => 'empresa',
            'empresa_id' => $empresa['id']
        ],
        'redirect' => 'dashboard_empresa.html'
    ]);
}

sendJsonResponse(['error' => 'Credenciais inválidas. Verifique seu e-mail e senha.'], 401);
