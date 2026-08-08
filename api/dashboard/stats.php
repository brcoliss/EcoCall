<?php
/* ==========================================================================
   EcoCall — Endpoint API: Estatísticas do Dashboard (GET /api/dashboard/stats.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

$session = checkAuthSession();
$userId = $session['user_id'];
$tipoUser = $session['tipo'] ?? 'user';

$pdo = getDBConnection();

if ($tipoUser === 'empresa') {
    $empresaId = $_SESSION['empresa_id'] ?? $userId;

    $stmtTotal = $pdo->prepare("SELECT COUNT(*) FROM coletas WHERE empresa_id = :eid");
    $stmtTotal->execute([':eid' => $empresaId]);
    $totalColetas = $stmtTotal->fetchColumn();

    $stmtConcluidas = $pdo->prepare("SELECT COUNT(*), SUM(peso_estimado_kg) FROM coletas WHERE empresa_id = :eid AND status = 'concluido'");
    $stmtConcluidas->execute([':eid' => $empresaId]);
    $rowC = $stmtConcluidas->fetch(PDO::FETCH_NUM);
    $concluidas = $rowC[0] ?? 0;
    $pesoTotal = $rowC[1] ?? 0;

    $stmtPendentes = $pdo->prepare("SELECT COUNT(*) FROM coletas WHERE (empresa_id = :eid OR empresa_id IS NULL) AND status = 'pendente'");
    $stmtPendentes->execute([':eid' => $empresaId]);
    $pendentes = $stmtPendentes->fetchColumn();

    sendJsonResponse([
        'success' => true,
        'tipo' => 'empresa',
        'stats' => [
            'total_coletas' => $totalColetas,
            'coletas_concluidas' => $concluidas,
            'peso_total_kg' => round(floatval($pesoTotal), 2),
            'pedidos_pendentes' => $pendentes
        ]
    ]);
} else {
    // Usuário cidadão
    $stmtUser = $pdo->prepare("SELECT pontos FROM usuarios WHERE id = :id");
    $stmtUser->execute([':id' => $userId]);
    $pontos = $stmtUser->fetchColumn() ?: 0;

    $stmtColetas = $pdo->prepare("SELECT COUNT(*), SUM(peso_estimado_kg) FROM coletas WHERE usuario_id = :uid AND status = 'concluido'");
    $stmtColetas->execute([':uid' => $userId]);
    $row = $stmtColetas->fetch(PDO::FETCH_NUM);
    $coletasConcluidas = $row[0] ?? 0;
    $pesoTotalKg = floatval($row[1] ?? 0);
    $co2Economizado = round($pesoTotalKg * 1.8, 1); // Exemplo: ~1.8kg CO2 evitado por kg reciclado

    $stmtProx = $pdo->prepare("SELECT c.*, e.razao_social as empresa_nome FROM coletas c LEFT JOIN empresas e ON c.empresa_id = e.id WHERE c.usuario_id = :uid AND c.status IN ('pendente', 'agendado') ORDER BY c.data_agendada ASC LIMIT 1");
    $stmtProx->execute([':uid' => $userId]);
    $proximaColeta = $stmtProx->fetch();

    sendJsonResponse([
        'success' => true,
        'tipo' => 'user',
        'stats' => [
            'pontos' => $pontos,
            'coletas_concluidas' => $coletasConcluidas,
            'peso_total_kg' => $pesoTotalKg,
            'co2_economizado_kg' => $co2Economizado,
            'proxima_coleta' => $proximaColeta ?: null
        ]
    ]);
}
