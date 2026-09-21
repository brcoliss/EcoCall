<?php
/* ==========================================================================
   EcoCall — Endpoint API: Atualizar Perfil do Usuário/Empresa (POST /api/auth/update_profile.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$session = checkAuthSession();
$userId = $session['user_id'];
$tipoUser = $session['tipo'] ?? 'user';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$pdo = getDBConnection();

$email = trim($data['email'] ?? '');
if (empty($email)) {
    sendJsonResponse(['error' => 'O campo e-mail é obrigatório.'], 400);
}

$valEmail = validarEmailReal($email);
if (!$valEmail['valido']) {
    sendJsonResponse(['error' => $valEmail['motivo']], 400);
}

$senhaNova = trim($data['senha'] ?? $data['nova_senha'] ?? '');

if ($tipoUser === 'empresa') {
    $empresaId = $_SESSION['empresa_id'] ?? $userId;
    
    // Valida duplicidade de e-mail em outras empresas e usuários
    $stmtCheckE = $pdo->prepare("SELECT id FROM empresas WHERE email = :email AND id != :id");
    $stmtCheckE->execute([':email' => $email, ':id' => $empresaId]);
    if ($stmtCheckE->fetch()) {
        sendJsonResponse(['error' => 'Este e-mail já está sendo utilizado por outra empresa.'], 400);
    }
    
    $stmtCheckU = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email");
    $stmtCheckU->execute([':email' => $email]);
    if ($stmtCheckU->fetch()) {
        sendJsonResponse(['error' => 'Este e-mail já está cadastrado como usuário cidadão.'], 400);
    }

    $razaoSocial = trim($data['razao_social'] ?? $data['nome'] ?? '');
    $cnpj = trim($data['cnpj'] ?? '');
    $telefone = trim($data['telefone'] ?? '');
    $cep = trim($data['cep'] ?? '');
    $tipoLogradouro = trim($data['tipo_logradouro'] ?? 'Rua');
    $logradouro = trim($data['logradouro'] ?? '');
    $numero = trim($data['numero'] ?? '');
    $complemento = trim($data['complemento'] ?? '');
    $bairro = trim($data['bairro'] ?? '');
    $cidade = trim($data['cidade'] ?? 'Santos');
    $uf = trim($data['uf'] ?? 'SP');
    $categoria = trim($data['categoria'] ?? 'Reciclagem Geral');
    $descricao = trim($data['descricao'] ?? '');

    if (empty($razaoSocial)) {
        sendJsonResponse(['error' => 'Razão Social não pode ficar em branco.'], 400);
    }

    $compAddress = trim($tipoLogradouro . ' ' . $logradouro . ', ' . $numero . ($complemento ? ' ' . $complemento : '') . ' - ' . $bairro . ', ' . $cidade . '/' . $uf);

    if (!empty($senhaNova)) {
        if (strlen($senhaNova) < 6) {
            sendJsonResponse(['error' => 'A nova senha deve possuir no mínimo 6 caracteres.'], 400);
        }
        $senhaHash = password_hash($senhaNova, PASSWORD_DEFAULT);
        $stmtUpd = $pdo->prepare("
            UPDATE empresas 
            SET razao_social = :razao_social, email = :email, senha = :senha, cnpj = :cnpj, telefone = :telefone,
                cep = :cep, tipo_logradouro = :tipo_logradouro, logradouro = :logradouro, numero = :numero,
                complemento = :complemento, bairro = :bairro, cidade = :cidade, uf = :uf, endereco = :endereco,
                categoria = :categoria, descricao = :descricao
            WHERE id = :id
        ");
        $stmtUpd->execute([
            ':razao_social' => $razaoSocial,
            ':email' => $email,
            ':senha' => $senhaHash,
            ':cnpj' => $cnpj,
            ':telefone' => $telefone,
            ':cep' => $cep,
            ':tipo_logradouro' => $tipoLogradouro,
            ':logradouro' => $logradouro,
            ':numero' => $numero,
            ':complemento' => $complemento,
            ':bairro' => $bairro,
            ':cidade' => $cidade,
            ':uf' => $uf,
            ':endereco' => $compAddress,
            ':categoria' => $categoria,
            ':descricao' => $descricao,
            ':id' => $empresaId
        ]);
    } else {
        $stmtUpd = $pdo->prepare("
            UPDATE empresas 
            SET razao_social = :razao_social, email = :email, cnpj = :cnpj, telefone = :telefone,
                cep = :cep, tipo_logradouro = :tipo_logradouro, logradouro = :logradouro, numero = :numero,
                complemento = :complemento, bairro = :bairro, cidade = :cidade, uf = :uf, endereco = :endereco,
                categoria = :categoria, descricao = :descricao
            WHERE id = :id
        ");
        $stmtUpd->execute([
            ':razao_social' => $razaoSocial,
            ':email' => $email,
            ':cnpj' => $cnpj,
            ':telefone' => $telefone,
            ':cep' => $cep,
            ':tipo_logradouro' => $tipoLogradouro,
            ':logradouro' => $logradouro,
            ':numero' => $numero,
            ':complemento' => $complemento,
            ':bairro' => $bairro,
            ':cidade' => $cidade,
            ':uf' => $uf,
            ':endereco' => $compAddress,
            ':categoria' => $categoria,
            ':descricao' => $descricao,
            ':id' => $empresaId
        ]);
    }

    $_SESSION['nome'] = $razaoSocial;
    $_SESSION['email'] = $email;

    sendJsonResponse([
        'success' => true,
        'message' => 'Perfil da empresa atualizado com sucesso!'
    ]);

} else {
    // Usuário Cidadão
    $stmtCheckU = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email AND id != :id");
    $stmtCheckU->execute([':email' => $email, ':id' => $userId]);
    if ($stmtCheckU->fetch()) {
        sendJsonResponse(['error' => 'Este e-mail já está sendo utilizado por outro usuário.'], 400);
    }
    
    $stmtCheckE = $pdo->prepare("SELECT id FROM empresas WHERE email = :email");
    $stmtCheckE->execute([':email' => $email]);
    if ($stmtCheckE->fetch()) {
        sendJsonResponse(['error' => 'Este e-mail já está cadastrado como empresa.'], 400);
    }

    $nome = trim($data['nome'] ?? '');
    $cpf = trim($data['cpf'] ?? '');
    $telefone = trim($data['telefone'] ?? '');
    $cep = trim($data['cep'] ?? '');
    $tipoLogradouro = trim($data['tipo_logradouro'] ?? 'Rua');
    $logradouro = trim($data['logradouro'] ?? '');
    $numero = trim($data['numero'] ?? '');
    $complemento = trim($data['complemento'] ?? '');
    $bairro = trim($data['bairro'] ?? '');
    $cidade = trim($data['cidade'] ?? 'Santos');
    $uf = trim($data['uf'] ?? 'SP');

    if (empty($nome)) {
        sendJsonResponse(['error' => 'O nome completo não pode ficar em branco.'], 400);
    }

    $compAddress = trim($tipoLogradouro . ' ' . $logradouro . ', ' . $numero . ($complemento ? ' ' . $complemento : '') . ' - ' . $bairro . ', ' . $cidade . '/' . $uf);

    if (!empty($senhaNova)) {
        if (strlen($senhaNova) < 6) {
            sendJsonResponse(['error' => 'A nova senha deve possuir no mínimo 6 caracteres.'], 400);
        }
        $senhaHash = password_hash($senhaNova, PASSWORD_DEFAULT);
        $stmtUpd = $pdo->prepare("
            UPDATE usuarios 
            SET nome = :nome, email = :email, senha = :senha, cpf = :cpf, telefone = :telefone,
                cep = :cep, tipo_logradouro = :tipo_logradouro, logradouro = :logradouro, numero = :numero,
                complemento = :complemento, bairro = :bairro, cidade = :cidade, uf = :uf, endereco = :endereco
            WHERE id = :id
        ");
        $stmtUpd->execute([
            ':nome' => $nome,
            ':email' => $email,
            ':senha' => $senhaHash,
            ':cpf' => $cpf,
            ':telefone' => $telefone,
            ':cep' => $cep,
            ':tipo_logradouro' => $tipoLogradouro,
            ':logradouro' => $logradouro,
            ':numero' => $numero,
            ':complemento' => $complemento,
            ':bairro' => $bairro,
            ':cidade' => $cidade,
            ':uf' => $uf,
            ':endereco' => $compAddress,
            ':id' => $userId
        ]);
    } else {
        $stmtUpd = $pdo->prepare("
            UPDATE usuarios 
            SET nome = :nome, email = :email, cpf = :cpf, telefone = :telefone,
                cep = :cep, tipo_logradouro = :tipo_logradouro, logradouro = :logradouro, numero = :numero,
                complemento = :complemento, bairro = :bairro, cidade = :cidade, uf = :uf, endereco = :endereco
            WHERE id = :id
        ");
        $stmtUpd->execute([
            ':nome' => $nome,
            ':email' => $email,
            ':cpf' => $cpf,
            ':telefone' => $telefone,
            ':cep' => $cep,
            ':tipo_logradouro' => $tipoLogradouro,
            ':logradouro' => $logradouro,
            ':numero' => $numero,
            ':complemento' => $complemento,
            ':bairro' => $bairro,
            ':cidade' => $cidade,
            ':uf' => $uf,
            ':endereco' => $compAddress,
            ':id' => $userId
        ]);
    }

    $_SESSION['nome'] = $nome;
    $_SESSION['email'] = $email;

    sendJsonResponse([
        'success' => true,
        'message' => 'Perfil do usuário atualizado com sucesso!'
    ]);
}
