<?php
/* ==========================================================================
   EcoCall — Endpoint API: Enviar Comprovante Digital por E-mail
   (POST /api/coletas/email_comprovante.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$protocolo = trim($data['protocolo'] ?? '');
$destinatarioEmail = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);

if (empty($protocolo)) {
    sendJsonResponse(['error' => 'Número do protocolo não informado.'], 400);
}

$pdo = getDBConnection();
$idParsed = intval(preg_replace('/\D/', '', $protocolo));

$stmt = $pdo->prepare("
    SELECT c.*,
           u.nome as cliente_nome, u.email as cliente_email,
           e.razao_social as empresa_nome, e.email as empresa_email, e.telefone as empresa_telefone
    FROM coletas c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN empresas e ON c.empresa_id = e.id
    WHERE c.protocolo = :proto OR c.id = :id
    LIMIT 1
");

$stmt->execute([':proto' => $protocolo, ':id' => $idParsed]);
$coleta = $stmt->fetch();

if (!$coleta) {
    sendJsonResponse(['error' => 'Coleta não localizada.'], 404);
}

$emailFinal = $destinatarioEmail ?: ($coleta['cliente_email'] ?? '');
$nomeFinal = $coleta['cliente_nome'] ?? 'Cidadão';

if (!$emailFinal) {
    sendJsonResponse(['error' => 'Endereço de e-mail de destino não informado.'], 400);
}

$protoStr = !empty($coleta['protocolo']) ? $coleta['protocolo'] : ('COL-' . str_pad($coleta['id'], 6, '0', STR_PAD_LEFT));
$pesoStr = number_format(floatval($coleta['peso_estimado_kg']), 1, ',', '.') . ' kg';

$dataFmt = date('d/m/Y', strtotime($coleta['data_agendada'] ?? 'now'));
$statusFmt = strtoupper($coleta['status'] ?? 'AGENDADO');

$conteudoCorpo = "
    <p>Olá, <strong>" . htmlspecialchars($nomeFinal) . "</strong>,</p>
    <p>Aqui está o seu <strong>Comprovante Oficial de Coleta Sustentável</strong> emitido pela plataforma <strong>EcoCall Santos</strong>.</p>
    
    <div style='background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:16px;margin:20px 0;'>
        <div style='font-size:18px;font-weight:bold;color:#14532d;margin-bottom:8px;'>
            Protocolo: {$protoStr}
        </div>
        <p style='margin:4px 0;'><strong>Status:</strong> <span style='color:#15803d;font-weight:bold;'>{$statusFmt}</span></p>
        <p style='margin:4px 0;'><strong>Coletor Parceiro:</strong> " . htmlspecialchars($coleta['empresa_nome'] ?? 'Cooperativa Credenciada') . "</p>
        <p style='margin:4px 0;'><strong>Resíduo / Material:</strong> " . htmlspecialchars($coleta['tipo_residuo']) . "</p>
        <p style='margin:4px 0;'><strong>Massa Estimada:</strong> {$pesoStr}</p>
        <p style='margin:4px 0;'><strong>Data Agendada:</strong> {$dataFmt} ({$coleta['turno']})</p>
        <p style='margin:4px 0;'><strong>Endereço de Coleta:</strong> " . htmlspecialchars($coleta['endereco_coleta']) . "</p>
    </div>
    
    <p style='color:#4b5563;font-size:13px;'>
        🌱 <em>Obrigado por ajudar a manter o município de Santos mais limpo e sustentável!</em>
    </p>
";

$corpoHtml = gerarTemplateEmailEcoCall(
    "Comprovante Oficial de Coleta — {$protoStr}",
    $conteudoCorpo,
    "Acessar Painel EcoCall",
    "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "/EcoCall/ecocall-login.html"
);

$resEmail = enviarEmail($emailFinal, $nomeFinal, "Comprovante Oficial de Coleta — EcoCall [{$protoStr}]", $corpoHtml);

sendJsonResponse([
    'success' => true,
    'message' => 'Comprovante enviado com sucesso para ' . $emailFinal . '!',
    'email_sent_to' => $emailFinal,
    'email_result' => $resEmail
]);
