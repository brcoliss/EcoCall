<?php
/* ==========================================================================
   EcoCall — Endpoint API: Ativação de Conta (GET / POST /api/auth/activate.php)
   Valida o token recebido por e-mail e ativa o acesso do cidadão ou empresa
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$token = trim($_GET['token'] ?? $data['token'] ?? '');

if (empty($token)) {
    sendJsonResponse(['error' => 'Token de ativação não informado ou inválido.'], 400);
}

$pdo = getDBConnection();

// 1. Busca na tabela de usuários
$stmtUser = $pdo->prepare("SELECT id, nome, email, status_conta, token_ativacao_expira FROM usuarios WHERE token_ativacao = :token");
$stmtUser->execute([':token' => $token]);
$user = $stmtUser->fetch();

if ($user) {
    if (!empty($user['token_ativacao_expira']) && strtotime($user['token_ativacao_expira']) < time()) {
        sendJsonResponse(['error' => 'Este link de ativação expirou (validade de 24h). Solicite um novo link de ativação.'], 400);
    }

    $stmtUpd = $pdo->prepare("UPDATE usuarios SET status_conta = 'ativo', email_verificado = 1, token_ativacao = NULL, token_ativacao_expira = NULL WHERE id = :id");
    $stmtUpd->execute([':id' => $user['id']]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Conta de cidadão ativada com sucesso! Seu e-mail foi autenticado.',
        'tipo' => 'user',
        'email' => $user['email'],
        'nome' => $user['nome']
    ]);
}

// 2. Busca na tabela de empresas
$stmtEmp = $pdo->prepare("SELECT id, razao_social, email, status_conta, token_ativacao_expira FROM empresas WHERE token_ativacao = :token");
$stmtEmp->execute([':token' => $token]);
$emp = $stmtEmp->fetch();

if ($emp) {
    if (!empty($emp['token_ativacao_expira']) && strtotime($emp['token_ativacao_expira']) < time()) {
        sendJsonResponse(['error' => 'Este link de ativação expirou (validade de 24h). Solicite um novo link de ativação.'], 400);
    }

    $stmtUpd = $pdo->prepare("UPDATE empresas SET status_conta = 'ativo', email_verificado = 1, token_ativacao = NULL, token_ativacao_expira = NULL WHERE id = :id");
    $stmtUpd->execute([':id' => $emp['id']]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Conta corporativa ativada com sucesso! O e-mail da sua empresa foi autenticado.',
        'tipo' => 'empresa',
        'email' => $emp['email'],
        'nome' => $emp['razao_social']
    ]);
}

sendJsonResponse(['error' => 'Link de ativação inválido, já utilizado ou inexistente.'], 404);
