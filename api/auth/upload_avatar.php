<?php
/* ==========================================================================
   EcoCall — Endpoint API: Upload de Foto/Logotipo de Perfil (POST /api/auth/upload_avatar.php)
   Suporta upload multipart/form-data e remoção de avatar para Cidadão e Empresa.
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$session = checkAuthSession();
$userId = $session['user_id'];
$tipoUser = $session['tipo'] ?? 'user';

$pdo = getDBConnection();

// Cria o diretório de uploads se não existir
$uploadDir = __DIR__ . '/../../uploads/avatars/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Verifica se é uma solicitação de remoção de avatar
$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);
$action = $_POST['action'] ?? $jsonData['action'] ?? '';

if ($action === 'remover' || $action === 'delete') {
    // Busca avatar antigo para deletar arquivo físico
    if ($tipoUser === 'empresa') {
        $empresaId = $_SESSION['empresa_id'] ?? $userId;
        $stmt = $pdo->prepare("SELECT avatar_url FROM empresas WHERE id = :id");
        $stmt->execute([':id' => $empresaId]);
        $curr = $stmt->fetch();
        if ($curr && !empty($curr['avatar_url']) && strpos($curr['avatar_url'], 'uploads/avatars/') !== false) {
            $oldPath = __DIR__ . '/../../' . $curr['avatar_url'];
            if (file_exists($oldPath)) { @unlink($oldPath); }
        }
        $stmtUpd = $pdo->prepare("UPDATE empresas SET avatar_url = NULL WHERE id = :id");
        $stmtUpd->execute([':id' => $empresaId]);
    } else {
        $stmt = $pdo->prepare("SELECT avatar_url FROM usuarios WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $curr = $stmt->fetch();
        if ($curr && !empty($curr['avatar_url']) && strpos($curr['avatar_url'], 'uploads/avatars/') !== false) {
            $oldPath = __DIR__ . '/../../' . $curr['avatar_url'];
            if (file_exists($oldPath)) { @unlink($oldPath); }
        }
        $stmtUpd = $pdo->prepare("UPDATE usuarios SET avatar_url = NULL WHERE id = :id");
        $stmtUpd->execute([':id' => $userId]);
    }

    $_SESSION['avatar_url'] = null;

    sendJsonResponse([
        'success' => true,
        'message' => 'Foto de perfil removida com sucesso!',
        'avatar_url' => null
    ]);
    exit;
}

// Processa arquivo enviado via FormData
$file = $_FILES['avatar'] ?? $_FILES['foto'] ?? $_FILES['file'] ?? $_FILES['logotipo'] ?? null;

if (!$file || empty($file['tmp_name'])) {
    sendJsonResponse(['error' => 'Nenhum arquivo de imagem foi enviado.'], 400);
}

if ($file['error'] !== UPLOAD_ERR_OK) {
    sendJsonResponse(['error' => 'Erro ao transferir o arquivo (código: ' . $file['error'] . ').'], 400);
}

// Valida tamanho do arquivo (máx 5MB)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    sendJsonResponse(['error' => 'O arquivo selecionado é muito grande. O limite máximo é de 5MB.'], 400);
}

// Valida tipo MIME real da imagem
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif'
];

if (!isset($allowedMimes[$mimeType])) {
    sendJsonResponse(['error' => 'Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.'], 400);
}

$ext = $allowedMimes[$mimeType];
$targetFilename = 'avatar_' . ($tipoUser === 'empresa' ? 'emp_' : 'usr_') . $userId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$targetPath = $uploadDir . $targetFilename;
$publicUrl = 'uploads/avatars/' . $targetFilename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    sendJsonResponse(['error' => 'Falha ao salvar a imagem no servidor. Verifique as permissões de pasta.'], 500);
}

// Atualiza banco de dados e remove foto anterior se houver
if ($tipoUser === 'empresa') {
    $empresaId = $_SESSION['empresa_id'] ?? $userId;
    $stmt = $pdo->prepare("SELECT avatar_url FROM empresas WHERE id = :id");
    $stmt->execute([':id' => $empresaId]);
    $curr = $stmt->fetch();
    if ($curr && !empty($curr['avatar_url']) && strpos($curr['avatar_url'], 'uploads/avatars/') !== false) {
        $oldPath = __DIR__ . '/../../' . $curr['avatar_url'];
        if (file_exists($oldPath) && $oldPath !== $targetPath) { @unlink($oldPath); }
    }

    $stmtUpd = $pdo->prepare("UPDATE empresas SET avatar_url = :avatar_url WHERE id = :id");
    $stmtUpd->execute([':avatar_url' => $publicUrl, ':id' => $empresaId]);
} else {
    $stmt = $pdo->prepare("SELECT avatar_url FROM usuarios WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $curr = $stmt->fetch();
    if ($curr && !empty($curr['avatar_url']) && strpos($curr['avatar_url'], 'uploads/avatars/') !== false) {
        $oldPath = __DIR__ . '/../../' . $curr['avatar_url'];
        if (file_exists($oldPath) && $oldPath !== $targetPath) { @unlink($oldPath); }
    }

    $stmtUpd = $pdo->prepare("UPDATE usuarios SET avatar_url = :avatar_url WHERE id = :id");
    $stmtUpd->execute([':avatar_url' => $publicUrl, ':id' => $userId]);
}

$_SESSION['avatar_url'] = $publicUrl;

sendJsonResponse([
    'success' => true,
    'message' => ($tipoUser === 'empresa' ? 'Logotipo' : 'Foto de perfil') . ' atualizada com sucesso!',
    'avatar_url' => $publicUrl
]);
