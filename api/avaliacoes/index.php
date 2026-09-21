<?php
/* ==========================================================================
   EcoCall — Endpoint API: Listar Avaliações (GET /api/avaliacoes/index.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

$session = checkAuthSession();
$userId = $session['user_id'];
$tipoUser = $session['tipo'] ?? 'user';

$pdo = getDBConnection();

$empresaIdReq = !empty($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;

if ($tipoUser === 'empresa' || $empresaIdReq > 0) {
    $empresaId = $empresaIdReq > 0 ? $empresaIdReq : ($_SESSION['empresa_id'] ?? $userId);

    $stmt = $pdo->prepare("
        SELECT a.id, a.coleta_id, a.nota, a.comentario, a.created_at,
               u.nome as cliente_nome, u.cidade as cliente_cidade, u.uf as cliente_uf,
               c.tipo_residuo, c.protocolo
        FROM avaliacoes a
        JOIN usuarios u ON a.usuario_id = u.id
        LEFT JOIN coletas c ON a.coleta_id = c.id
        WHERE a.empresa_id = :eid
        ORDER BY a.created_at DESC
    ");
    $stmt->execute([':eid' => $empresaId]);
    $avaliacoes = $stmt->fetchAll();

    $dist = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
    $somaNotas = 0;
    foreach ($avaliacoes as $av) {
        $n = max(1, min(5, intval($av['nota'])));
        $dist[$n]++;
        $somaNotas += $n;
    }

    $total = count($avaliacoes);
    $media = $total > 0 ? round($somaNotas / $total, 1) : 5.0;

    sendJsonResponse([
        'success' => true,
        'total' => $total,
        'nota_media' => $media,
        'distribuicao' => $dist,
        'avaliacoes' => $avaliacoes
    ]);

} else {
    // Avaliações feitas pelo cidadão
    $stmt = $pdo->prepare("
        SELECT a.id, a.coleta_id, a.nota, a.comentario, a.created_at,
               e.razao_social as empresa_nome, e.categoria as empresa_categoria,
               c.tipo_residuo, c.protocolo
        FROM avaliacoes a
        JOIN empresas e ON a.empresa_id = e.id
        LEFT JOIN coletas c ON a.coleta_id = c.id
        WHERE a.usuario_id = :uid
        ORDER BY a.created_at DESC
    ");
    $stmt->execute([':uid' => $userId]);
    $avaliacoes = $stmt->fetchAll();

    sendJsonResponse([
        'success' => true,
        'total' => count($avaliacoes),
        'avaliacoes' => $avaliacoes
    ]);
}
