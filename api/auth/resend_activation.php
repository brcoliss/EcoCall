<?php
/* ==========================================================================
   EcoCall — Endpoint API: Reenviar Link de Ativação (POST /api/auth/resend_activation.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$email = trim($data['email'] ?? '');
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(['error' => 'Por favor, informe um e-mail válido.'], 400);
}

$valEmail = validarEmailReal($email);
if (!$valEmail['valido']) {
    sendJsonResponse(['error' => $valEmail['motivo']], 400);
}

$pdo = getDBConnection();
$tokenAtivacao = bin2hex(random_bytes(32));
$expiraEm = date('Y-m-d H:i:s', strtotime('+24 hours'));

$protocoloHost = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$hostName = $_SERVER['HTTP_HOST'] ?? 'localhost';
$linkAtivacao = $protocoloHost . $hostName . '/EcoCall/ecocall-ativar.html?token=' . $tokenAtivacao;

// 1. Busca em usuários
$stmtUser = $pdo->prepare("SELECT id, nome, email, status_conta FROM usuarios WHERE email = :email");
$stmtUser->execute([':email' => $email]);
$user = $stmtUser->fetch();

if ($user) {
    if ($user['status_conta'] === 'ativo') {
        sendJsonResponse(['error' => 'Esta conta já se encontra ativa. Você pode fazer login diretamente.'], 400);
    }
    $upd = $pdo->prepare("UPDATE usuarios SET token_ativacao = :token, token_ativacao_expira = :exp WHERE id = :id");
    $upd->execute([':token' => $tokenAtivacao, ':exp' => $expiraEm, ':id' => $user['id']]);

    $assunto = "EcoCall - Novo link de ativação";
    $nome = $user['nome'];
    $mensagemHtml = "<p>Olá, <strong>{$nome}</strong>!</p>
                     <p>Você solicitou um novo link de ativação para a sua conta de cidadão no <strong>EcoCall</strong>.</p>
                     <p>Para desbloquear seu acesso à plataforma, clique no botão abaixo:</p>";
    
    $corpo = gerarTemplateEmailEcoCall("Novo Link de Ativação", $mensagemHtml, "Ativar Minha Conta", $linkAtivacao);
    
    $envio = enviarEmail($email, $nome, $assunto, $corpo);

    sendJsonResponse([
        'success' => true,
        'message' => 'Novo link de ativação gerado com sucesso! Verifique a sua caixa de entrada.',
        'email' => $email,
        'email_enviado' => $envio['success'],
        'email_provider' => $envio['provider'] ?? 'smtp',
        'email_error' => $envio['error'] ?? null,
        'link_ativacao' => $linkAtivacao
    ]);
}

// 2. Busca em empresas
$stmtEmp = $pdo->prepare("SELECT id, razao_social, email, status_conta FROM empresas WHERE email = :email");
$stmtEmp->execute([':email' => $email]);
$emp = $stmtEmp->fetch();

if ($emp) {
    if ($emp['status_conta'] === 'ativo') {
        sendJsonResponse(['error' => 'Esta conta corporativa já se encontra ativa. Você pode fazer login diretamente.'], 400);
    }
    $upd = $pdo->prepare("UPDATE empresas SET token_ativacao = :token, token_ativacao_expira = :exp WHERE id = :id");
    $upd->execute([':token' => $tokenAtivacao, ':exp' => $expiraEm, ':id' => $emp['id']]);

    $assunto = "EcoCall - Novo link de ativação corporativa";
    $nome = $emp['razao_social'];
    $mensagemHtml = "<p>Olá, <strong>{$nome}</strong>!</p>
                     <p>Você solicitou um novo link de ativação para a sua conta empresarial no <strong>EcoCall</strong>.</p>
                     <p>Para concluir a verificação da sua empresa, confirme no botão abaixo:</p>";
    
    $corpo = gerarTemplateEmailEcoCall("Ativação de Conta Corporativa", $mensagemHtml, "Ativar Conta Corporativa", $linkAtivacao);
    
    $envio = enviarEmail($email, $nome, $assunto, $corpo);

    sendJsonResponse([
        'success' => true,
        'message' => 'Novo link de ativação gerado com sucesso! Verifique o e-mail corporativo.',
        'email' => $email,
        'email_enviado' => $envio['success'],
        'email_provider' => $envio['provider'] ?? 'smtp',
        'email_error' => $envio['error'] ?? null,
        'link_ativacao' => $linkAtivacao
    ]);
}

sendJsonResponse(['error' => 'Nenhuma conta cadastrada encontrada para o e-mail informado.'], 404);
