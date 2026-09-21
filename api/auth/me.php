<?php
/* ==========================================================================
   EcoCall — Endpoint API: Dados do Usuário Logado (GET /api/auth/me.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

$session = checkAuthSession();
$userId = $session['user_id'];
$tipo = $session['tipo'] ?? 'user';

$pdo = getDBConnection();

if ($tipo === 'empresa') {
    $empresaId = $_SESSION['empresa_id'] ?? $userId;
    $stmtEmp = $pdo->prepare("SELECT id, razao_social, cnpj, email, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, categoria, descricao, avatar_url, nota_media, coletas_concluidas, created_at FROM empresas WHERE id = :id");
    $stmtEmp->execute([':id' => $empresaId]);
    $empresa = $stmtEmp->fetch();

    if ($empresa) {
        sendJsonResponse([
            'authenticated' => true,
            'user' => [
                'id' => $empresa['id'],
                'nome' => $empresa['razao_social'],
                'email' => $empresa['email'],
                'tipo' => 'empresa',
                'empresa_id' => $empresa['id'],
                'avatar_url' => $empresa['avatar_url'] ?? null
            ],
            'empresa' => $empresa
        ]);
    }

    // Fallback: empresa registrada na tabela usuarios
    $stmtU = $pdo->prepare("SELECT id, nome, email, cpf, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, avatar_url, tipo, pontos, created_at FROM usuarios WHERE id = :id");
    $stmtU->execute([':id' => $userId]);
    $userAsEmp = $stmtU->fetch();

    if ($userAsEmp) {
        sendJsonResponse([
            'authenticated' => true,
            'user' => [
                'id' => $userAsEmp['id'],
                'nome' => $userAsEmp['nome'],
                'email' => $userAsEmp['email'],
                'tipo' => 'empresa',
                'empresa_id' => $userAsEmp['id'],
                'avatar_url' => $userAsEmp['avatar_url'] ?? null
            ],
            'empresa' => [
                'id' => $userAsEmp['id'],
                'razao_social' => $userAsEmp['nome'],
                'cnpj' => $userAsEmp['cpf'] ?? '',
                'email' => $userAsEmp['email'],
                'telefone' => $userAsEmp['telefone'],
                'cep' => $userAsEmp['cep'],
                'tipo_logradouro' => $userAsEmp['tipo_logradouro'],
                'logradouro' => $userAsEmp['logradouro'],
                'numero' => $userAsEmp['numero'],
                'complemento' => $userAsEmp['complemento'],
                'bairro' => $userAsEmp['bairro'],
                'cidade' => $userAsEmp['cidade'] ?? 'Santos',
                'uf' => $userAsEmp['uf'] ?? 'SP',
                'endereco' => $userAsEmp['endereco'],
                'categoria' => 'Reciclagem Geral',
                'descricao' => '',
                'avatar_url' => $userAsEmp['avatar_url'] ?? null,
                'nota_media' => 5.00,
                'coletas_concluidas' => 0,
                'created_at' => $userAsEmp['created_at']
            ]
        ]);
    }

    sendJsonResponse(['error' => 'Empresa não encontrada.'], 404);
} else {
    $stmt = $pdo->prepare("SELECT id, nome, email, cpf, telefone, cep, tipo_logradouro, logradouro, numero, complemento, bairro, cidade, uf, endereco, avatar_url, tipo, pontos, created_at FROM usuarios WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJsonResponse(['error' => 'Usuário não encontrado.'], 404);
    }

    $isEmp = ($user['tipo'] ?? 'user') === 'empresa';

    $userSafe = [
        'id' => $user['id'],
        'nome' => $user['nome'],
        'email' => $user['email'],
        'cpf' => $user['cpf'],
        'telefone' => $user['telefone'],
        'cep' => $user['cep'],
        'tipo_logradouro' => $user['tipo_logradouro'],
        'logradouro' => $user['logradouro'],
        'numero' => $user['numero'],
        'complemento' => $user['complemento'],
        'bairro' => $user['bairro'],
        'cidade' => $user['cidade'] ?? 'Santos',
        'uf' => $user['uf'] ?? 'SP',
        'endereco' => $user['endereco'],
        'avatar_url' => $user['avatar_url'] ?? null,
        'tipo' => $isEmp ? 'empresa' : 'user',
        'pontos' => $user['pontos'] ?? 0,
        'empresa_id' => $isEmp ? $user['id'] : null,
        'created_at' => $user['created_at']
    ];

    sendJsonResponse([
        'authenticated' => true,
        'user' => $userSafe,
        'empresa' => $isEmp ? [
            'id' => $user['id'],
            'razao_social' => $user['nome'],
            'cnpj' => $user['cpf'] ?? '',
            'email' => $user['email'],
            'telefone' => $user['telefone'],
            'cidade' => $user['cidade'] ?? 'Santos',
            'uf' => $user['uf'] ?? 'SP',
            'categoria' => 'Reciclagem Geral',
            'avatar_url' => $user['avatar_url'] ?? null,
            'coletas_concluidas' => 0,
            'created_at' => $user['created_at']
        ] : null
    ]);
}
