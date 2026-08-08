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
    $stmtEmp = $pdo->prepare("SELECT id, razao_social, cnpj, email, telefone, cidade, categoria, descricao, nota_media, coletas_concluidas, created_at FROM empresas WHERE id = :id");
    $stmtEmp->execute([':id' => $empresaId]);
    $empresa = $stmtEmp->fetch();

    if (!$empresa) {
        sendJsonResponse(['error' => 'Empresa não encontrada.'], 404);
    }

    sendJsonResponse([
        'authenticated' => true,
        'user' => [
            'id' => $empresa['id'],
            'nome' => $empresa['razao_social'],
            'email' => $empresa['email'],
            'tipo' => 'empresa'
        ],
        'empresa' => $empresa
    ]);
} else {
    $stmt = $pdo->prepare("SELECT id, nome, email, cpf, telefone, cep, endereco, numero, cidade, uf, tipo, pontos, created_at FROM usuarios WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJsonResponse(['error' => 'Usuário não encontrado.'], 404);
    }

    sendJsonResponse([
        'authenticated' => true,
        'user' => $user,
        'empresa' => null
    ]);
}
