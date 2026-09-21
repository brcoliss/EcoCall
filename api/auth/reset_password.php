<?php
/* ==========================================================================
   EcoCall — Endpoint API: Redefinir Senha (POST /api/auth/reset_password.php)
   Valida o código de 6 dígitos recebido por E-mail e atualiza a senha de forma segura
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$email = trim($data['email'] ?? $data['identificador'] ?? '');
$codigo = trim($data['codigo'] ?? '');
$novaSenha = trim($data['nova_senha'] ?? $data['senha'] ?? '');

if (empty($email) || empty($codigo) || empty($novaSenha)) {
    sendJsonResponse(['error' => 'Informe seu e-mail, o código de 6 dígitos e a nova senha.'], 400);
}

if (strlen($novaSenha) < 6) {
    sendJsonResponse(['error' => 'A nova senha deve possuir no mínimo 6 caracteres.'], 400);
}

$pdo = getDBConnection();

// 1. Busca o código no histórico de password_resets
$stmtCheck = $pdo->prepare("
    SELECT id, conta_id, identificador, tipo_conta, expira_em, utilizado 
    FROM password_resets 
    WHERE codigo = :cod 
      AND LOWER(identificador) = LOWER(:email)
    ORDER BY id DESC LIMIT 1
");

$stmtCheck->execute([
    ':cod'   => $codigo,
    ':email' => $email
]);
$resetRecord = $stmtCheck->fetch();

if (!$resetRecord) {
    // Fallback: busca pelo código não utilizado mais recente
    $stmtFallback = $pdo->prepare("
        SELECT id, conta_id, identificador, tipo_conta, expira_em, utilizado 
        FROM password_resets 
        WHERE codigo = :cod 
        ORDER BY id DESC LIMIT 1
    ");
    $stmtFallback->execute([':cod' => $codigo]);
    $resetRecord = $stmtFallback->fetch();
}

if (!$resetRecord) {
    sendJsonResponse(['error' => 'Código de verificação incorreto ou inválido.'], 400);
}

if ($resetRecord['utilizado'] == 1) {
    sendJsonResponse(['error' => 'Este código de verificação já foi utilizado anteriormente.'], 400);
}

if (strtotime($resetRecord['expira_em']) < time()) {
    sendJsonResponse(['error' => 'Este código expirou (validade de 15 minutos). Solicite um novo código.'], 400);
}

$hashNovaSenha = password_hash($novaSenha, PASSWORD_DEFAULT);
$tipoConta = $resetRecord['tipo_conta'] ?? 'user';
$contaId = !empty($resetRecord['conta_id']) ? (int)$resetRecord['conta_id'] : null;
$targetEmail = !empty($resetRecord['identificador']) ? $resetRecord['identificador'] : $email;

// 2. Atualiza a senha na tabela correspondente e garante que a conta fique ativa e com e-mail verificado
if ($tipoConta === 'empresa') {
    if ($contaId) {
        $stmtUpd = $pdo->prepare("UPDATE empresas SET senha = :senha, status_conta = 'ativo', email_verificado = 1 WHERE id = :cid");
        $stmtUpd->execute([':senha' => $hashNovaSenha, ':cid' => $contaId]);
    } else {
        $stmtUpd = $pdo->prepare("UPDATE empresas SET senha = :senha, status_conta = 'ativo', email_verificado = 1 WHERE LOWER(email) = LOWER(:email)");
        $stmtUpd->execute([':senha' => $hashNovaSenha, ':email' => $targetEmail]);
    }
} else {
    // Usuário cidadão
    if ($contaId) {
        $stmtUpd = $pdo->prepare("UPDATE usuarios SET senha = :senha, status_conta = 'ativo', email_verificado = 1 WHERE id = :cid");
        $stmtUpd->execute([':senha' => $hashNovaSenha, ':cid' => $contaId]);
    } else {
        $stmtUpd = $pdo->prepare("UPDATE usuarios SET senha = :senha, status_conta = 'ativo', email_verificado = 1 WHERE LOWER(email) = LOWER(:email)");
        $stmtUpd->execute([':senha' => $hashNovaSenha, ':email' => $targetEmail]);
    }
}

// 3. Marca o código como utilizado
$stmtDone = $pdo->prepare("UPDATE password_resets SET utilizado = 1 WHERE id = :id");
$stmtDone->execute([':id' => $resetRecord['id']]);

sendJsonResponse([
    'success' => true,
    'message' => 'Sua senha foi redefinida com sucesso! Você já pode entrar com suas novas credenciais.',
    'redirect' => 'ecocall-login.html'
]);
