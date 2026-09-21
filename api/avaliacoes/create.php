<?php
/* ==========================================================================
   EcoCall — Endpoint API: Enviar Avaliação (POST /api/avaliacoes/create.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$session = checkAuthSession();
$userId = $session['user_id'];

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$coletaId = intval($data['coleta_id'] ?? 0);
$nota = max(1, min(5, intval($data['nota'] ?? 5)));
$comentario = trim($data['comentario'] ?? '');

if ($coletaId <= 0) {
    sendJsonResponse(['error' => 'ID da coleta inválido.'], 400);
}

$pdo = getDBConnection();

// Busca a coleta e valida se pertence ao usuário e está concluída
$stmt = $pdo->prepare("SELECT * FROM coletas WHERE id = :id AND usuario_id = :uid");
$stmt->execute([':id' => $coletaId, ':uid' => $userId]);
$coleta = $stmt->fetch();

if (!$coleta) {
    sendJsonResponse(['error' => 'Coleta não encontrada ou não pertence a este usuário.'], 404);
}

if ($coleta['status'] !== 'concluido') {
    sendJsonResponse(['error' => 'Apenas coletas concluídas podem ser avaliadas.'], 400);
}

if (empty($coleta['empresa_id'])) {
    sendJsonResponse(['error' => 'Esta coleta não possui empresa vinculada para avaliação.'], 400);
}

$empresaId = intval($coleta['empresa_id']);

// Verifica se já foi avaliada
$stmtCheck = $pdo->prepare("SELECT id FROM avaliacoes WHERE coleta_id = :cid");
$stmtCheck->execute([':cid' => $coletaId]);
if ($stmtCheck->fetch()) {
    sendJsonResponse(['error' => 'Esta coleta já foi avaliada anteriormente.'], 400);
}

// Insere a avaliação
$stmtIns = $pdo->prepare("
    INSERT INTO avaliacoes (coleta_id, usuario_id, empresa_id, nota, comentario)
    VALUES (:coleta_id, :usuario_id, :empresa_id, :nota, :comentario)
");
$stmtIns->execute([
    ':coleta_id' => $coletaId,
    ':usuario_id' => $userId,
    ':empresa_id' => $empresaId,
    ':nota' => $nota,
    ':comentario' => $comentario ?: null
]);

$avaliacaoId = $pdo->lastInsertId();

// Recalcula e atualiza a nota média da empresa
$stmtAvg = $pdo->prepare("SELECT AVG(nota) as media FROM avaliacoes WHERE empresa_id = :eid");
$stmtAvg->execute([':eid' => $empresaId]);
$novaMedia = round(floatval($stmtAvg->fetchColumn()), 2);

$stmtUpdEmp = $pdo->prepare("UPDATE empresas SET nota_media = :media WHERE id = :eid");
$stmtUpdEmp->execute([':media' => $novaMedia, ':eid' => $empresaId]);

// Dá +10 pontos ao usuário pelo feedback
$stmtPts = $pdo->prepare("UPDATE usuarios SET pontos = pontos + 10 WHERE id = :uid");
$stmtPts->execute([':uid' => $userId]);

sendJsonResponse([
    'success' => true,
    'message' => 'Avaliação enviada com sucesso! Você ganhou +10 pontos por contribuir.',
    'avaliacao_id' => $avaliacaoId,
    'nova_nota_media_empresa' => $novaMedia
], 201);
