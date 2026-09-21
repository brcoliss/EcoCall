<?php
/* ==========================================================================
   EcoCall — Endpoint API: Atualizar Status da Coleta (POST /api/coletas/update.php)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$session = checkAuthSession();
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$coletaId = intval($data['coleta_id'] ?? $data['id'] ?? 0);
$protocoloInput = trim($data['protocolo'] ?? '');
$novoStatus = trim($data['status'] ?? '');

$statusPermitidos = ['pendente', 'agendado', 'concluido', 'cancelado'];
if ($coletaId <= 0 && empty($protocoloInput)) {
    sendJsonResponse(['error' => 'Informe o ID ou Protocolo da coleta.'], 400);
}

if (!in_array($novoStatus, $statusPermitidos)) {
    sendJsonResponse(['error' => 'Status informado não é permitido.'], 400);
}

$pdo = getDBConnection();

if ($coletaId > 0) {
    $stmt = $pdo->prepare("SELECT * FROM coletas WHERE id = :id");
    $stmt->execute([':id' => $coletaId]);
} else {
    $stmt = $pdo->prepare("SELECT * FROM coletas WHERE protocolo = :proto");
    $stmt->execute([':proto' => $protocoloInput]);
}

$coleta = $stmt->fetch();

if (!$coleta) {
    sendJsonResponse(['error' => 'Coleta não encontrada.'], 404);
}

$coletaId = intval($coleta['id']);
$protocolo = $coleta['protocolo'];

if (empty($protocolo)) {
    $protocolo = 'ECO-' . date('Ymd') . '-' . str_pad($coletaId, 4, '0', STR_PAD_LEFT);
    $stmtProto = $pdo->prepare("UPDATE coletas SET protocolo = :proto WHERE id = :id");
    $stmtProto->execute([':proto' => $protocolo, ':id' => $coletaId]);
}

// Se a sessão for de uma empresa e o empresa_id estiver nulo, vincula a empresa que aceitou
if (($session['tipo'] ?? '') === 'empresa' && empty($coleta['empresa_id'])) {
    $empId = $_SESSION['empresa_id'] ?? $_SESSION['user_id'];
    $stmtBind = $pdo->prepare("UPDATE coletas SET empresa_id = :eid WHERE id = :id");
    $stmtBind->execute([':eid' => $empId, ':id' => $coletaId]);
    $coleta['empresa_id'] = $empId;
}

// Permissões: se for usuário cidadão, só pode cancelar sua própria coleta
if (($session['tipo'] ?? '') === 'user') {
    if (intval($coleta['usuario_id']) !== intval($session['user_id'])) {
        sendJsonResponse(['error' => 'Acesso negado. Esta coleta pertence a outro usuário.'], 403);
    }
    if ($novoStatus !== 'cancelado') {
        sendJsonResponse(['error' => 'Usuários cidadãos só podem cancelar solicitações.'], 403);
    }
}

// Permissões: se for empresa, só pode atualizar se estiver vinculada a ela ou for pendente sem empresa
if (($session['tipo'] ?? '') === 'empresa') {
    $myEmpId = $_SESSION['empresa_id'] ?? $_SESSION['user_id'];
    if (!empty($coleta['empresa_id']) && intval($coleta['empresa_id']) !== intval($myEmpId)) {
        sendJsonResponse(['error' => 'Acesso negado. Esta coleta está vinculada a outra empresa.'], 403);
    }
}

// Atualiza o status
$stmtUpd = $pdo->prepare("UPDATE coletas SET status = :status WHERE id = :id");
$stmtUpd->execute([':status' => $novoStatus, ':id' => $coletaId]);

// Se concluído e empresa vinculada, incrementa contador da empresa e soma 50 pontos ao usuário
if ($novoStatus === 'concluido' && $coleta['status'] !== 'concluido') {
    if (!empty($coleta['empresa_id'])) {
        $stmtE = $pdo->prepare("UPDATE empresas SET coletas_concluidas = coletas_concluidas + 1 WHERE id = :eid");
        $stmtE->execute([':eid' => $coleta['empresa_id']]);
    }
    $stmtU = $pdo->prepare("UPDATE usuarios SET pontos = pontos + 50 WHERE id = :uid");
    $stmtU->execute([':uid' => $coleta['usuario_id']]);

    // Dispara notificação por e-mail exclusivamente ao finalizar o chamado
    try {
        $stmtClient = $pdo->prepare("SELECT nome, email FROM usuarios WHERE id = :uid");
        $stmtClient->execute([':uid' => $coleta['usuario_id']]);
        $client = $stmtClient->fetch();

        if ($client && !empty($client['email'])) {
            $protocoloHost = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
            $hostName = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $linkPdf = $protocoloHost . $hostName . '/EcoCall/api/coletas/pdf.php?protocolo=' . urlencode($protocolo) . '&print=1';

            $assunto = "EcoCall — Sua Coleta Seletiva foi Concluída com Sucesso! 🌿";
            $msgHtml = "<p>Olá, <strong>" . htmlspecialchars($client['nome']) . "</strong>!</p>" .
                       "<p>Informamos que a sua solicitação de coleta seletiva (Protocolo: <strong>{$protocolo}</strong>) foi <strong>concluída e finalizada</strong> com sucesso pela equipe parceira!</p>" .
                       "<div style='background:#ecfdf5;border:1px solid #10b981;border-radius:10px;padding:12px 18px;margin:15px 0;'>" .
                       "<strong style='color:#065f46;'>🎉 Parabéns!</strong> Você acumulou <strong>+50 EcoPontos</strong> pela sua contribuição com o meio ambiente de Santos/SP." .
                       "</div>" .
                       "<p>Você já pode acessar e imprimir o comprovante oficial da ordem de serviço clicando no botão abaixo:</p>";

            $corpoEmail = gerarTemplateEmailEcoCall("Coleta Concluída com Sucesso", $msgHtml, "📄 Visualizar Comprovante em PDF", $linkPdf);
            @enviarEmail($client['email'], $client['nome'], $assunto, $corpoEmail);
        }
    } catch (Exception $e) {
        // Log silencioso para não interromper a resposta JSON
    }
}

$pdfUrl = 'api/coletas/pdf.php?protocolo=' . urlencode($protocolo) . '&print=1';

sendJsonResponse([
    'success' => true,
    'message' => 'Status do protocolo ' . $protocolo . ' atualizado para "' . $novoStatus . '" com sucesso.',
    'coleta_id' => $coletaId,
    'protocolo' => $protocolo,
    'status' => $novoStatus,
    'pdf_url' => $pdfUrl
]);
