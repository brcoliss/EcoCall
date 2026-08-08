<?php
/* ==========================================================================
   EcoCall — Endpoint API: Listar Coletas (GET /api/coletas/index.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

$session = checkAuthSession();
$userId = $session['user_id'];
$tipoUser = $session['tipo'] ?? 'user';

$pdo = getDBConnection();

if ($tipoUser === 'empresa') {
    $empresaId = $_SESSION['empresa_id'] ?? $userId;

    // Coletas atribuídas à empresa ou pendentes globais
    $stmt = $pdo->prepare("
        SELECT c.*, u.nome as cliente_nome, u.telefone as cliente_telefone, u.email as cliente_email
        FROM coletas c
        JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.empresa_id = :empresa_id OR (c.status = 'pendente' AND c.empresa_id IS NULL)
        ORDER BY c.data_agendada DESC, c.id DESC
    ");
    $stmt->execute([':empresa_id' => $empresaId]);
} else {
    // Coletas solicitadas pelo usuário cidadão
    $stmt = $pdo->prepare("
        SELECT c.*, e.razao_social as empresa_nome, e.categoria as empresa_categoria
        FROM coletas c
        LEFT JOIN empresas e ON c.empresa_id = e.id
        WHERE c.usuario_id = :usuario_id
        ORDER BY c.data_agendada DESC, c.id DESC
    ");
    $stmt->execute([':usuario_id' => $userId]);
}

$coletas = $stmt->fetchAll();

sendJsonResponse([
    'success' => true,
    'total' => count($coletas),
    'coletas' => $coletas
]);
