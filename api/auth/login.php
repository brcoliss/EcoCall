<?php
/* ==========================================================================
   EcoCall — Endpoint API: Login (POST /api/auth/login.php)
   Com validação de status de ativação da conta (Anti-robô) e segurança reforçada
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
    sendJsonResponse(['error' => 'Por favor, informe um e-mail válido e sua senha.'], 400);
}

$pdo = getDBConnection();

// 1. Tenta buscar primeiro na tabela dedicada de empresas
$stmtEmp = $pdo->prepare("SELECT id, razao_social, cnpj, email, senha, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, status_conta, email_verificado, token_ativacao FROM empresas WHERE email = :email");
$stmtEmp->execute([':email' => $email]);
$empresa = $stmtEmp->fetch();

if ($empresa && password_verify($senha, $empresa['senha'])) {
    if (($empresa['status_conta'] ?? 'ativo') === 'pendente_ativacao') {
        $protocoloHost = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $hostName = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $linkAtivacao = $protocoloHost . $hostName . '/EcoCall/ecocall-ativar.html?token=' . ($empresa['token_ativacao'] ?? '');

        sendJsonResponse([
            'error' => 'Sua conta corporativa ainda não foi ativada. Por favor, acesse o link enviado para o seu e-mail para confirmar seu cadastro e provar que não é um robô.',
            'pending_activation' => true,
            'email' => $empresa['email'],
            'link_ativacao' => $linkAtivacao
        ], 403);
    }

    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        session_start();
    }
    session_regenerate_id(true);
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
            'telefone' => $empresa['telefone'] ?? '',
            'cep' => $empresa['cep'] ?? '',
            'tipo_logradouro' => $empresa['tipo_logradouro'] ?? 'Rua',
            'logradouro' => $empresa['logradouro'] ?? '',
            'numero' => $empresa['numero'] ?? '',
            'complemento' => $empresa['complemento'] ?? '',
            'bairro' => $empresa['bairro'] ?? '',
            'cidade' => $empresa['cidade'] ?? 'Santos',
            'uf' => $empresa['uf'] ?? 'SP',
            'endereco' => $empresa['endereco'] ?? '',
            'tipo' => 'empresa',
            'empresa_id' => $empresa['id']
        ],
        'redirect' => 'dashboard_empresa.html'
    ]);
}

// 2. Tenta buscar na tabela de usuários (cidadãos ou empresas legadas)
$stmt = $pdo->prepare("SELECT id, nome, email, senha, cpf, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, tipo, pontos, status_conta, email_verificado, token_ativacao FROM usuarios WHERE email = :email");
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if ($user && password_verify($senha, $user['senha'])) {
    if (($user['status_conta'] ?? 'ativo') === 'pendente_ativacao') {
        $protocoloHost = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $hostName = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $linkAtivacao = $protocoloHost . $hostName . '/EcoCall/ecocall-ativar.html?token=' . ($user['token_ativacao'] ?? '');

        sendJsonResponse([
            'error' => 'Sua conta de cidadão ainda não foi ativada. Por favor, acesse o link de ativação enviado para o seu e-mail para validar seu acesso e comprovar que não é um robô.',
            'pending_activation' => true,
            'email' => $user['email'],
            'link_ativacao' => $linkAtivacao
        ], 403);
    }

    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        session_start();
    }
    session_regenerate_id(true);
    
    $isEmpresa = ($user['tipo'] ?? 'user') === 'empresa';
    $tipoFinal = $isEmpresa ? 'empresa' : 'user';

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['nome'] = $user['nome'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['tipo'] = $tipoFinal;
    if ($isEmpresa) {
        $_SESSION['empresa_id'] = $user['id'];
    } else {
        unset($_SESSION['empresa_id']);
    }

    sendJsonResponse([
        'success' => true,
        'message' => $isEmpresa ? 'Login de empresa realizado com sucesso!' : 'Login de usuário realizado com sucesso!',
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
            'tipo' => $tipoFinal,
            'pontos' => $user['pontos'] ?? 0,
            'empresa_id' => $isEmpresa ? $user['id'] : null
        ],
        'redirect' => $isEmpresa ? 'dashboard_empresa.html' : 'ecocall-dashbord_usuario.html'
    ]);
}

sendJsonResponse(['error' => 'Credenciais inválidas. Verifique seu e-mail e senha.'], 401);
