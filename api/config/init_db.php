<?php
/* ==========================================================================
   EcoCall — Script de Inicialização e Criação do Banco de Dados
   ========================================================================== */

require_once __DIR__ . '/db.php';

$pdo = getDBConnection();

// Executa o schema SQL
$sqlFile = __DIR__ . '/schema.sql';
if (!file_exists($sqlFile)) {
    sendJsonResponse(['error' => 'Arquivo schema.sql não foi encontrado.'], 500);
}

$sqlCommands = file_get_contents($sqlFile);
try {
    $pdo->exec($sqlCommands);
} catch (PDOException $e) {
    sendJsonResponse(['error' => 'Erro ao executar o schema de tabelas: ' . $e->getMessage()], 500);
}

// Inserir dados padrão de teste caso a tabela de usuários esteja vazia
$stmt = $pdo->query("SELECT COUNT(*) FROM usuarios");
$count = $stmt->fetchColumn();

if ($count == 0) {
    // 1. Criar usuário cidadão padrão
    $senhaUser = password_hash('123456', PASSWORD_DEFAULT);
    $stmtUser = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, cpf, telefone, cep, endereco, cidade, uf, tipo, pontos) 
        VALUES (:nome, :email, :senha, :cpf, :telefone, :cep, :endereco, :cidade, :uf, 'user', 340)");
    $stmtUser->execute([
        ':nome' => 'Ana Clara Silva',
        ':email' => 'usuario@ecocall.com',
        ':senha' => $senhaUser,
        ':cpf' => '123.456.789-00',
        ':telefone' => '(13) 99876-5432',
        ':cep' => '11000-000',
        ':endereco' => 'Av. Ana Costa, 150 - Gonzaga',
        ':cidade' => 'Santos',
        ':uf' => 'SP'
    ]);
    $userId = $pdo->lastInsertId();

    // 2. Criar empresa parceira padrão (diretamente na tabela empresas)
    $senhaEmpresa = password_hash('123456', PASSWORD_DEFAULT);
    $stmtEmpresa = $pdo->prepare("INSERT INTO empresas (razao_social, cnpj, email, senha, telefone, cidade, categoria, descricao, nota_media, coletas_concluidas) 
        VALUES (:razao_social, :cnpj, :email, :senha, :telefone, :cidade, :categoria, :descricao, 4.90, 142)");
    $stmtEmpresa->execute([
        ':razao_social' => 'Santista Ambiental Ltda',
        ':cnpj' => '12.345.678/0001-90',
        ':email' => 'empresa@ecocall.com',
        ':senha' => $senhaEmpresa,
        ':telefone' => '(13) 3234-5678',
        ':cidade' => 'Santos',
        ':categoria' => 'Plásticos e Metais',
        ':descricao' => 'Especializada em coleta seletiva urbana e resíduos secos.'
    ]);
    $empresaId = $pdo->lastInsertId();

    // 3. Inserir coletas de demonstração
    $stmtColeta = $pdo->prepare("INSERT INTO coletas (usuario_id, empresa_id, tipo_residuo, peso_estimado_kg, data_agendada, turno, endereco_coleta, status, observacoes) 
        VALUES (:usuario_id, :empresa_id, :tipo_residuo, :peso, :data_agendada, :turno, :endereco, :status, :obs)");
    
    $stmtColeta->execute([
        ':usuario_id' => $userId,
        ':empresa_id' => $empresaId,
        ':tipo_residuo' => 'Papel e Papelão',
        ':peso' => 12.50,
        ':data_agendada' => date('Y-m-d', strtotime('+2 days')),
        ':turno' => 'Manhã',
        ':endereco' => 'Av. Ana Costa, 150 - Gonzaga, Santos/SP',
        ':status' => 'agendado',
        ':obs' => 'Caixas dobradas e organizadas na garagem.'
    ]);

    $stmtColeta->execute([
        ':usuario_id' => $userId,
        ':empresa_id' => $empresaId,
        ':tipo_residuo' => 'Plásticos e Garrafas PET',
        ':peso' => 8.00,
        ':data_agendada' => date('Y-m-d', strtotime('-3 days')),
        ':turno' => 'Tarde',
        ':endereco' => 'Av. Ana Costa, 150 - Gonzaga, Santos/SP',
        ':status' => 'concluido',
        ':obs' => 'Coleta realizada no horário.'
    ]);
}

sendJsonResponse([
    'success' => true,
    'message' => 'Banco de dados MySQL inicializado e tabelas criadas com sucesso!',
    'seed_users' => [
        ['tipo' => 'user', 'email' => 'usuario@ecocall.com', 'senha' => '123456'],
        ['tipo' => 'empresa', 'email' => 'empresa@ecocall.com', 'senha' => '123456']
    ]
]);
