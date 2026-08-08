<?php
/* ==========================================================================
   EcoCall — Endpoint API: Atualizar Status da Coleta (POST /api/coletas/update.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$session = checkAuthSession();
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$coletaId = intval($data['coleta_id'] ?? $data['id'] ?? 0);
$novoStatus = trim($data['status'] ?? '');

$statusPermitidos = ['pendente', 'agendado', 'concluido', 'cancelado'];
if ($coletaId <= 0 || !in_array($novoStatus, $statusPermitidos)) {
    sendJsonResponse(['error' => 'ID da coleta inválido ou status não permitido.'], 400);
}

$pdo = getDBConnection();

$stmt = $pdo->prepare("SELECT * FROM coletas WHERE id = :id");
$stmt->execute([':id' => $coletaId]);
$coleta = $stmt->fetch();

if (!$coleta) {
    sendJsonResponse(['error' => 'Coleta não encontrada.'], 404);
}

// Atualiza o status
$stmtUpd = $pdo->prepare("UPDATE coletas SET status = :status WHERE id = :id");
$stmtUpd->execute([':status' => $novoStatus, ':id' => $coletaId]);

// Se concluído e empresa vinculada, incrementa contador da empresa e soma 50 pontos ao usuário
if ($novoStatus === 'concluido') {
    if (!empty($coleta['empresa_id'])) {
        $stmtE = $pdo->prepare("UPDATE empresas SET coletas_concluidas = coletas_concluidas + 1 WHERE id = :eid");
        $stmtE->execute([':eid' => $coleta['empresa_id']]);
    }
    $stmtU = $pdo->prepare("UPDATE usuarios SET pontos = pontos + 50 WHERE id = :uid");
    $stmtU->execute([':uid' => $coleta['usuario_id']]);
}

sendJsonResponse([
    'success' => true,
    'message' => 'Status da coleta atualizado para "' . $novoStatus . '" com sucesso.'
]);
