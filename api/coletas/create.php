<?php
/* ==========================================================================
   EcoCall — Endpoint API: Solicitar Coleta (POST /api/coletas/create.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$session = checkAuthSession();
$userId = $session['user_id'];

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$tipoResiduo = trim($data['tipo_residuo'] ?? '');
$pesoKg = floatval($data['peso_estimado_kg'] ?? $data['peso'] ?? 1.0);
$dataAgendada = trim($data['data_agendada'] ?? $data['data'] ?? '');
$turno = trim($data['turno'] ?? 'Manhã');
$enderecoColeta = trim($data['endereco_coleta'] ?? $data['endereco'] ?? '');
$empresaId = !empty($data['empresa_id']) ? intval($data['empresa_id']) : null;
$observacoes = trim($data['observacoes'] ?? '');

if (empty($tipoResiduo) || empty($dataAgendada) || empty($enderecoColeta)) {
    sendJsonResponse(['error' => 'Preencha o tipo de resíduo, data agendada e endereço de coleta.'], 400);
}

$pdo = getDBConnection();

$stmt = $pdo->prepare("
    INSERT INTO coletas (usuario_id, empresa_id, tipo_residuo, peso_estimado_kg, data_agendada, turno, endereco_coleta, status, observacoes)
    VALUES (:usuario_id, :empresa_id, :tipo_residuo, :peso_estimado_kg, :data_agendada, :turno, :endereco_coleta, 'pendente', :observacoes)
");

$stmt->execute([
    ':usuario_id' => $userId,
    ':empresa_id' => $empresaId,
    ':tipo_residuo' => $tipoResiduo,
    ':peso_estimado_kg' => $pesoKg,
    ':data_agendada' => $dataAgendada,
    ':turno' => $turno,
    ':endereco_coleta' => $enderecoColeta,
    ':observacoes' => $observacoes
]);

$coletaId = $pdo->lastInsertId();

// Atualiza pontos do usuário (+20 pontos por solicitação)
$stmtPts = $pdo->prepare("UPDATE usuarios SET pontos = pontos + 20 WHERE id = :id");
$stmtPts->execute([':id' => $userId]);

sendJsonResponse([
    'success' => true,
    'message' => 'Solicitação de coleta criada com sucesso!',
    'coleta_id' => $coletaId
], 201);
