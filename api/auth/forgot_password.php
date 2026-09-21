<?php
/* ==========================================================================
   EcoCall — Endpoint API: Solicitar Código de Recuperação de Senha (POST /api/auth/forgot_password.php)
   Recuperação Exclusiva por E-mail (Resend API + SMTP Gmail Contingência)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$email = trim($data['email'] ?? $data['identificador'] ?? '');

if (empty($email)) {
    sendJsonResponse(['error' => 'Por favor, informe seu endereço de e-mail cadastrado.'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(['error' => 'Por favor, informe um formato de e-mail válido.'], 400);
}

$valEmail = validarEmailReal($email);
if (!$valEmail['valido']) {
    sendJsonResponse(['error' => $valEmail['motivo']], 400);
}

$pdo = getDBConnection();
$contaEncontrada = null;
$tipoConta = 'user';

// 1. Busca conta de usuário cidadão por e-mail
$stmtU = $pdo->prepare("SELECT id, nome, email FROM usuarios WHERE email = :email");
$stmtU->execute([':email' => $email]);
$contaEncontrada = $stmtU->fetch();

if ($contaEncontrada) {
    $tipoConta = 'user';
} else {
    // 2. Busca conta de empresa por e-mail
    $stmtE = $pdo->prepare("SELECT id, razao_social as nome, email FROM empresas WHERE email = :email");
    $stmtE->execute([':email' => $email]);
    $contaEncontrada = $stmtE->fetch();
    if ($contaEncontrada) {
        $tipoConta = 'empresa';
    }
}

if (!$contaEncontrada) {
    sendJsonResponse([
        'error' => 'Nenhuma conta de cidadão ou empresa foi encontrada com o e-mail informado.'
    ], 404);
}

$contaId = (int)$contaEncontrada['id'];
$contaNome = $contaEncontrada['nome'];
$contaEmail = $contaEncontrada['email'];

// Gera código numérico seguro de 6 dígitos
$codigo = str_pad(strval(random_int(100000, 999999)), 6, '0', STR_PAD_LEFT);
$expiraEm = date('Y-m-d H:i:s', strtotime('+15 minutes'));

// Invalida códigos anteriores não utilizados para esta conta
$stmtInv = $pdo->prepare("
    UPDATE password_resets 
    SET utilizado = 1 
    WHERE (conta_id = :cid AND tipo_conta = :tipo) 
       OR identificador = :email
");
$stmtInv->execute([
    ':cid'   => $contaId,
    ':tipo'  => $tipoConta,
    ':email' => $contaEmail
]);

// Salva o novo código de verificação
$stmtIns = $pdo->prepare("
    INSERT INTO password_resets (conta_id, identificador, metodo, codigo, tipo_conta, utilizado, expira_em)
    VALUES (:conta_id, :identificador, 'email', :codigo, :tipo_conta, 0, :expira_em)
");
$stmtIns->execute([
    ':conta_id'     => $contaId,
    ':identificador'=> $contaEmail,
    ':codigo'       => $codigo,
    ':tipo_conta'   => $tipoConta,
    ':expira_em'    => $expiraEm
]);

// Mascaramento de e-mail para exibição segura (ex: ad****@senacsp.edu.br)
$emParts = explode('@', $contaEmail);
$userPart = $emParts[0];
$domainPart = $emParts[1] ?? 'ecocall.com';
$userMask = substr($userPart, 0, 2) . str_repeat('*', max(1, strlen($userPart) - 3)) . substr($userPart, -1);
$destinoMascarado = $userMask . '@' . $domainPart;

// Envio do e-mail com template moderno e profissional
$assunto = "EcoCall - Código de Recuperação de Senha";
$mensagemHtml = "<p>Olá, <strong>{$contaNome}</strong>!</p>
                 <p>Recebemos uma solicitação para redefinir a senha de acesso da sua conta no <strong>EcoCall</strong>.</p>
                 <p>Utilize o código de segurança de 6 dígitos abaixo para prosseguir com a redefinição da sua senha:</p>";

$corpo = gerarTemplateEmailEcoCall("Recuperação de Senha", $mensagemHtml, null, null, $codigo);
$envio = enviarEmail($contaEmail, $contaNome, $assunto, $corpo);

sendJsonResponse([
    'success' => true,
    'message' => 'Código de verificação de 6 dígitos enviado para seu e-mail com sucesso!',
    'metodo' => 'email',
    'destino_mascarado' => $destinoMascarado,
    'identificador' => $contaEmail,
    'email_enviado' => $envio['success'],
    'email_provider' => $envio['provider'] ?? 'smtp',
    'email_error' => $envio['error'] ?? null,
    'preview_codigo' => $codigo // Fornecido para teste em ambiente local / simulação
]);
