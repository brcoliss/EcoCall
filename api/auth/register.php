<?php
/* ==========================================================================
   EcoCall — Endpoint API: Cadastro (POST /api/auth/register.php)
   Com validação de e-mail real e geração de link de ativação anti-robô
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$tipo = ($data['tipo'] ?? 'user') === 'empresa' ? 'empresa' : 'user';
$nome = trim($data['nome'] ?? $data['razao_social'] ?? '');
$email = trim($data['email'] ?? '');
$senha = $data['password'] ?? $data['senha'] ?? '';

if (empty($nome) || empty($email) || strlen($senha) < 6) {
    sendJsonResponse(['error' => 'Preencha todos os campos obrigatórios (nome, e-mail válido e senha de no mínimo 6 caracteres).'], 400);
}

// Validação de E-mail Real e Existente (Anti-robô e anti-fictício)
$valEmail = validarEmailReal($email);
if (!$valEmail['valido']) {
    sendJsonResponse(['error' => $valEmail['motivo']], 400);
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

// Gerar token de ativação único de 64 caracteres hexadecimais
$tokenAtivacao = bin2hex(random_bytes(32));
$expiraEm = date('Y-m-d H:i:s', strtotime('+24 hours'));

$protocoloHost = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$hostName = $_SERVER['HTTP_HOST'] ?? 'localhost';
$linkAtivacao = $protocoloHost . $hostName . '/EcoCall/ecocall-ativar.html?token=' . $tokenAtivacao;

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

        $stmtEmp = $pdo->prepare("INSERT INTO empresas (razao_social, cnpj, email, senha, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, categoria, descricao, status_conta, email_verificado, token_ativacao, token_ativacao_expira) 
            VALUES (:razao_social, :cnpj, :email, :senha, :telefone, :cep, :tipo_logradouro, :logradouro, :numero, :complemento, :bairro, :cidade, :uf, :endereco, :categoria, :descricao, 'pendente_ativacao', 0, :token, :expira)");
        
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
            ':descricao' => $descricao,
            ':token' => $tokenAtivacao,
            ':expira' => $expiraEm
        ]);

        $empresaId = $pdo->lastInsertId();

        // Envia o e-mail real com template moderno
        $assunto = "EcoCall - Ative sua conta corporativa";
        $mensagemHtml = "<p>Olá, <strong>{$nome}</strong>!</p>
                         <p>Agradecemos por registrar sua empresa no <strong>EcoCall</strong> — a plataforma inteligente de sustentabilidade e coleta seletiva.</p>
                         <p>Para concluir a ativação do seu acesso corporativo e comprovar que esta solicitação é autêntica, confirme sua conta no botão abaixo:</p>";
        
        $corpo = gerarTemplateEmailEcoCall("Ativação de Conta Corporativa", $mensagemHtml, "Ativar Minha Conta", $linkAtivacao);
        
        $envio = enviarEmail($email, $nome, $assunto, $corpo);

        sendJsonResponse([
            'success' => true,
            'pending_activation' => true,
            'message' => 'Cadastro corporativo realizado com sucesso! Enviamos um link de ativação para o seu e-mail para validar sua conta e comprovar que não é um robô.',
            'email' => $email,
            'email_enviado' => $envio['success'],
            'email_provider' => $envio['provider'] ?? 'smtp',
            'email_error' => $envio['error'] ?? null,
            // Mantendo o link para teste local, remover em produção
            'link_ativacao' => $linkAtivacao,
            'token' => $tokenAtivacao
        ], 201);

    } else {
        // Cidadão (user)
        $cpf = trim($data['cpf'] ?? '');

        $stmtUser = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, cpf, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, tipo, pontos, status_conta, email_verificado, token_ativacao, token_ativacao_expira) 
            VALUES (:nome, :email, :senha, :cpf, :telefone, :cep, :tipo_logradouro, :logradouro, :numero, :complemento, :bairro, :cidade, :uf, :endereco, 'user', 50, 'pendente_ativacao', 0, :token, :expira)");
        
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
            ':endereco' => $enderecoCompleto ?: null,
            ':token' => $tokenAtivacao,
            ':expira' => $expiraEm
        ]);
        
        $userId = $pdo->lastInsertId();

        // Envia o e-mail real com template moderno
        $assunto = "EcoCall - Ative sua conta de Cidadão";
        $mensagemHtml = "<p>Olá, <strong>{$nome}</strong>!</p>
                         <p>Seja muito bem-vindo(a) ao <strong>EcoCall</strong>! Sua conta de cidadão foi criada com sucesso.</p>
                         <p>Para ativar seu acesso, acumular pontos por reciclagem e começar a agendar coletas, confirme seu e-mail no botão abaixo:</p>";
        
        $corpo = gerarTemplateEmailEcoCall("Ativação de Conta", $mensagemHtml, "Ativar Minha Conta", $linkAtivacao);
        
        $envio = enviarEmail($email, $nome, $assunto, $corpo);

        sendJsonResponse([
            'success' => true,
            'pending_activation' => true,
            'message' => 'Cadastro realizado com sucesso! Enviamos um link de ativação para o seu e-mail para validar sua conta e comprovar que não é um robô.',
            'email' => $email,
            'email_enviado' => $envio['success'],
            'email_provider' => $envio['provider'] ?? 'smtp',
            'email_error' => $envio['error'] ?? null,
            // Mantendo o link para teste local, remover em produção
            'link_ativacao' => $linkAtivacao,
            'token' => $tokenAtivacao
        ], 201);
    }

} catch (Exception $e) {
    sendJsonResponse(['error' => 'Erro ao salvar cadastro no banco de dados: ' . $e->getMessage()], 500);
}
