<?php
/* ==========================================================================
   EcoCall — Endpoint API: Cadastro (POST /api/auth/register.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$tipo = ($data['tipo'] ?? 'user') === 'empresa' ? 'empresa' : 'user';
$nome = trim($data['nome'] ?? $data['razao_social'] ?? '');
$email = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$senha = $data['password'] ?? $data['senha'] ?? '';

if (empty($nome) || !$email || strlen($senha) < 6) {
    sendJsonResponse(['error' => 'Preencha todos os campos obrigatórios (nome, e-mail válido e senha de no mínimo 6 caracteres).'], 400);
}

$pdo = getDBConnection();

// Verifica duplicidade de e-mail em usuários cidadãos e empresas
$stmtCheckU = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email");
$stmtCheckU->execute([':email' => $email]);
if ($stmtCheckU->fetch()) {
    sendJsonResponse(['error' => 'Este e-mail já está cadastrado no sistema.'], 400);
}

$stmtCheckE = $pdo->prepare("SELECT id FROM empresas WHERE email = :email");
$stmtCheckE->execute([':email' => $email]);
if ($stmtCheckE->fetch()) {
    sendJsonResponse(['error' => 'Este e-mail já está cadastrado no sistema.'], 400);
}

$hashSenha = password_hash($senha, PASSWORD_DEFAULT);
$telefone = trim($data['telefone'] ?? '');
$cep = trim($data['cep'] ?? '');
$tipoLogradouro = !empty(trim($data['tipo_logradouro'] ?? '')) ? trim($data['tipo_logradouro']) : 'Rua';
$logradouro = trim($data['logradouro'] ?? $data['endereco'] ?? '');
$numero = trim($data['numero'] ?? '');
$complemento = trim($data['complemento'] ?? '');
$bairro = trim($data['bairro'] ?? '');
$cidade = !empty(trim($data['cidade'] ?? '')) ? trim($data['cidade']) : 'Santos';
$uf = !empty(trim($data['uf'] ?? '')) ? trim($data['uf']) : 'SP';

// Endereço completo formatado
$enderecoCompleto = trim($tipoLogradouro . ' ' . $logradouro . ($numero ? ', ' . $numero : '') . ($complemento ? ' (' . $complemento . ')' : '') . ($bairro ? ' - ' . $bairro : ''));

try {
    if ($tipo === 'empresa') {
        $cnpj = trim($data['cnpj'] ?? '');
        $categoria = trim($data['categoria'] ?? 'Reciclagem Geral');
        $descricao = trim($data['descricao'] ?? '');

        if (empty($cnpj)) {
            sendJsonResponse(['error' => 'CNPJ é obrigatório para cadastro de empresa.'], 400);
        }

        $stmtCheckCNPJ = $pdo->prepare("SELECT id FROM empresas WHERE cnpj = :cnpj");
        $stmtCheckCNPJ->execute([':cnpj' => $cnpj]);
        if ($stmtCheckCNPJ->fetch()) {
            sendJsonResponse(['error' => 'Este CNPJ já está cadastrado no sistema.'], 400);
        }

        $stmtEmp = $pdo->prepare("INSERT INTO empresas (razao_social, cnpj, email, senha, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, categoria, descricao) 
            VALUES (:razao_social, :cnpj, :email, :senha, :telefone, :cep, :tipo_logradouro, :logradouro, :numero, :complemento, :bairro, :cidade, :uf, :endereco, :categoria, :descricao)");
        $stmtEmp->execute([
            ':razao_social' => $nome,
            ':cnpj' => $cnpj,
            ':email' => $email,
            ':senha' => $hashSenha,
            ':telefone' => $telefone ?: null,
            ':cep' => $cep ?: null,
            ':tipo_logradouro' => $tipoLogradouro,
            ':logradouro' => $logradouro ?: null,
            ':numero' => $numero ?: null,
            ':complemento' => $complemento ?: null,
            ':bairro' => $bairro ?: null,
            ':cidade' => $cidade,
            ':uf' => $uf,
            ':endereco' => $enderecoCompleto ?: null,
            ':categoria' => $categoria,
            ':descricao' => $descricao
        ]);

        $empresaId = $pdo->lastInsertId();

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $empresaId;
        $_SESSION['empresa_id'] = $empresaId;
        $_SESSION['nome'] = $nome;
        $_SESSION['email'] = $email;
        $_SESSION['tipo'] = 'empresa';

        sendJsonResponse([
            'success' => true,
            'message' => 'Cadastro de empresa realizado com sucesso!',
            'user' => [
                'id' => $empresaId,
                'nome' => $nome,
                'email' => $email,
                'tipo' => 'empresa',
                'empresa_id' => $empresaId
            ],
            'redirect' => 'dashboard_empresa.html'
        ], 201);

    } else {
        // Cidadão (user)
        $cpf = trim($data['cpf'] ?? '');

        $stmtUser = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, cpf, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, tipo, pontos) 
            VALUES (:nome, :email, :senha, :cpf, :telefone, :cep, :tipo_logradouro, :logradouro, :numero, :complemento, :bairro, :cidade, :uf, :endereco, 'user', 50)");
        
        $stmtUser->execute([
            ':nome' => $nome,
            ':email' => $email,
            ':senha' => $hashSenha,
            ':cpf' => $cpf ?: null,
            ':telefone' => $telefone ?: null,
            ':cep' => $cep ?: null,
            ':tipo_logradouro' => $tipoLogradouro,
            ':logradouro' => $logradouro ?: null,
            ':numero' => $numero ?: null,
            ':complemento' => $complemento ?: null,
            ':bairro' => $bairro ?: null,
            ':cidade' => $cidade,
            ':uf' => $uf,
            ':endereco' => $enderecoCompleto ?: null
        ]);
        
        $userId = $pdo->lastInsertId();

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $userId;
        $_SESSION['nome'] = $nome;
        $_SESSION['email'] = $email;
        $_SESSION['tipo'] = 'user';

        sendJsonResponse([
            'success' => true,
            'message' => 'Cadastro realizado com sucesso!',
            'user' => [
                'id' => $userId,
                'nome' => $nome,
                'email' => $email,
                'tipo' => 'user',
                'empresa_id' => null
            ],
            'redirect' => 'ecocall-dashbord_usuario.html'
        ], 201);
    }

} catch (Exception $e) {
    sendJsonResponse(['error' => 'Erro ao salvar cadastro no banco de dados: ' . $e->getMessage()], 500);
}
