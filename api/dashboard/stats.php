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

    $stmtEmp = $pdo->prepare("SELECT nota_media, coletas_concluidas FROM empresas WHERE id = :eid");
    $stmtEmp->execute([':eid' => $empresaId]);
    $empData = $stmtEmp->fetch();

    $stmtTotal = $pdo->prepare("SELECT COUNT(*) FROM coletas WHERE empresa_id = :eid OR (status = 'pendente' AND empresa_id IS NULL)");
    $stmtTotal->execute([':eid' => $empresaId]);
    $totalColetas = $stmtTotal->fetchColumn();

    $stmtConcluidas = $pdo->prepare("SELECT COUNT(*), SUM(peso_estimado_kg) FROM coletas WHERE empresa_id = :eid AND status = 'concluido'");
    $stmtConcluidas->execute([':eid' => $empresaId]);
    $rowC = $stmtConcluidas->fetch(PDO::FETCH_NUM);
    $concluidas = intval($rowC[0] ?? 0);
    $pesoTotal = floatval($rowC[1] ?? 0);

    $stmtPendentes = $pdo->prepare("SELECT COUNT(*) FROM coletas WHERE (empresa_id = :eid OR empresa_id IS NULL) AND status = 'pendente'");
    $stmtPendentes->execute([':eid' => $empresaId]);
    $pendentes = intval($stmtPendentes->fetchColumn() ?: 0);

    $stmtAgendadas = $pdo->prepare("SELECT COUNT(*) FROM coletas WHERE empresa_id = :eid AND status = 'agendado'");
    $stmtAgendadas->execute([':eid' => $empresaId]);
    $agendadas = intval($stmtAgendadas->fetchColumn() ?: 0);

    $stmtCanceladas = $pdo->prepare("SELECT COUNT(*) FROM coletas WHERE empresa_id = :eid AND status = 'cancelado'");
    $stmtCanceladas->execute([':eid' => $empresaId]);
    $canceladas = intval($stmtCanceladas->fetchColumn() ?: 0);

    // Top clientes que solicitaram para esta empresa
    $stmtTop = $pdo->prepare("
        SELECT u.id, u.nome, u.cidade, u.uf, COUNT(c.id) as total_coletas, SUM(c.peso_estimado_kg) as massa_total, MAX(c.data_agendada) as ultima_data
        FROM coletas c
        JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.empresa_id = :eid
        GROUP BY u.id, u.nome, u.cidade, u.uf
        ORDER BY total_coletas DESC, massa_total DESC
        LIMIT 5
    ");
    $stmtTop->execute([':eid' => $empresaId]);
    $topClientes = $stmtTop->fetchAll();

    // Consulta de avaliações da empresa
    $stmtAv = $pdo->prepare("SELECT COUNT(*) as total, AVG(nota) as media FROM avaliacoes WHERE empresa_id = :eid");
    $stmtAv->execute([':eid' => $empresaId]);
    $avRow = $stmtAv->fetch();
    $notaMedia = floatval($avRow['media'] ?: ($empData['nota_media'] ?? 5.00));
    $totalAvaliacoes = intval($avRow['total'] ?? 0);

    $co2Evitado = round($pesoTotal * 1.8, 1);

    sendJsonResponse([
        'success' => true,
        'tipo' => 'empresa',
        'stats' => [
            'total_coletas' => $totalColetas,
            'coletas_concluidas' => $concluidas,
            'pedidos_pendentes' => $pendentes,
            'pedidos_agendados' => $agendadas,
            'pedidos_cancelados' => $canceladas,
            'peso_total_kg' => round($pesoTotal, 2),
            'co2_economizado_kg' => $co2Evitado,
            'nota_media' => round($notaMedia, 2),
            'total_avaliacoes' => $totalAvaliacoes,
            'top_clientes' => $topClientes
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
