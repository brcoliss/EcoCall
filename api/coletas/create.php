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
$pdo = getDBConnection();

$empresaId = !empty($data['empresa_id']) ? intval($data['empresa_id']) : null;
$empresaNome = trim($data['empresa_nome'] ?? '');

if (!$empresaId && !empty($empresaNome)) {
    $stmtEmp = $pdo->prepare("SELECT id FROM empresas WHERE razao_social LIKE :nome LIMIT 1");
    $stmtEmp->execute([':nome' => '%' . $empresaNome . '%']);
    $empRow = $stmtEmp->fetch();
    if ($empRow) {
        $empresaId = intval($empRow['id']);
    }
}
$observacoes = trim($data['observacoes'] ?? '');

if (empty($tipoResiduo) || empty($dataAgendada) || empty($enderecoColeta)) {
    sendJsonResponse(['error' => 'Preencha o tipo de resíduo, data agendada e endereço de coleta.'], 400);
}

// Validação estrita: O serviço opera exclusivamente no município de Santos/SP
if (!stripos($enderecoColeta, 'Santos')) {
    sendJsonResponse(['error' => 'O serviço de coleta do EcoCall opera exclusivamente no município de Santos/SP. Por favor, informe um endereço de retirada em Santos.'], 400);
}

// Validação estrita de CEP de Santos (deve começar obrigatoriamente com '110')
if (preg_match('/(?:CEP:?\s*|)(\d{5})-?(\d{3})/i', $enderecoColeta, $matches)) {
    $cepDigits = $matches[1] . $matches[2];
    if (substr($cepDigits, 0, 3) !== '110') {
        sendJsonResponse(['error' => 'Atendimento exclusivo em Santos/SP! O CEP (' . $cepDigits . ') não pertence ao município de Santos (o CEP deve começar com 110).'], 400);
    }
}

$protocolo = 'ECO-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

$stmt = $pdo->prepare("
    INSERT INTO coletas (usuario_id, empresa_id, tipo_residuo, peso_estimado_kg, data_agendada, turno, endereco_coleta, status, observacoes, protocolo)
    VALUES (:usuario_id, :empresa_id, :tipo_residuo, :peso_estimado_kg, :data_agendada, :turno, :endereco_coleta, 'pendente', :observacoes, :protocolo)
");

$stmt->execute([
    ':usuario_id' => $userId,
    ':empresa_id' => $empresaId,
    ':tipo_residuo' => $tipoResiduo,
    ':peso_estimado_kg' => $pesoKg,
    ':data_agendada' => $dataAgendada,
    ':turno' => $turno,
    ':endereco_coleta' => $enderecoColeta,
    ':observacoes' => $observacoes,
    ':protocolo' => $protocolo
]);

$coletaId = $pdo->lastInsertId();

// Atualiza pontos do usuário (+20 pontos por solicitação)
$stmtPts = $pdo->prepare("UPDATE usuarios SET pontos = pontos + 20 WHERE id = :id");
$stmtPts->execute([':id' => $userId]);

sendJsonResponse([
    'success' => true,
    'message' => 'Solicitação de coleta criada com sucesso!',
    'coleta_id' => $coletaId,
    'protocolo' => $protocolo
], 201);
