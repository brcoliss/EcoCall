<?php
/* ==========================================================================
   EcoCall — Endpoint API: Exclusão Permanente de Conta (POST /api/auth/delete_account.php)
   Permite que o usuário cidadão ou empresa parceira encerre e remova seu cadastro.
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Método não permitido.'], 405);
}

$session = checkAuthSession();
$userId = $session['user_id'];
$tipoUser = $session['tipo'] ?? 'user';

$pdo = getDBConnection();

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

try {
    $pdo->beginTransaction();

    if ($tipoUser === 'empresa') {
        $empresaId = $_SESSION['empresa_id'] ?? $userId;

        // 1. Busca dados para deletar foto de perfil e registros vinculados
        $stmtEmp = $pdo->prepare("SELECT id, email, avatar_url FROM empresas WHERE id = :id");
        $stmtEmp->execute([':id' => $empresaId]);
        $emp = $stmtEmp->fetch();

        if ($emp) {
            $email = $emp['email'];
            if (!empty($emp['avatar_url']) && strpos($emp['avatar_url'], 'uploads/avatars/') !== false) {
                $oldPath = __DIR__ . '/../../' . $emp['avatar_url'];
                if (file_exists($oldPath)) { @unlink($oldPath); }
            }

            // Remove redefinições de senha
            $stmtResets = $pdo->prepare("DELETE FROM password_resets WHERE identificador = :email OR (conta_id = :id AND tipo_conta = 'empresa')");
            $stmtResets->execute([':email' => $email, ':id' => $empresaId]);

            // Remove avaliações vinculadas
            $stmtAv = $pdo->prepare("DELETE FROM avaliacoes WHERE empresa_id = :id");
            $stmtAv->execute([':id' => $empresaId]);

            // Desvincula ou remove coletas
            $stmtColetas = $pdo->prepare("UPDATE coletas SET empresa_id = NULL WHERE empresa_id = :id");
            $stmtColetas->execute([':id' => $empresaId]);

            // Deleta empresa
            $stmtDel = $pdo->prepare("DELETE FROM empresas WHERE id = :id");
            $stmtDel->execute([':id' => $empresaId]);

            // Deleta se houver conta espelho em usuarios
            $stmtDelU = $pdo->prepare("DELETE FROM usuarios WHERE email = :email AND tipo = 'empresa'");
            $stmtDelU->execute([':email' => $email]);
        }
    } else {
        // Usuário Cidadão
        $stmtU = $pdo->prepare("SELECT id, email, avatar_url FROM usuarios WHERE id = :id");
        $stmtU->execute([':id' => $userId]);
        $user = $stmtU->fetch();

        if ($user) {
            $email = $user['email'];
            if (!empty($user['avatar_url']) && strpos($user['avatar_url'], 'uploads/avatars/') !== false) {
                $oldPath = __DIR__ . '/../../' . $user['avatar_url'];
                if (file_exists($oldPath)) { @unlink($oldPath); }
            }

            // Remove redefinições de senha
            $stmtResets = $pdo->prepare("DELETE FROM password_resets WHERE identificador = :email OR (conta_id = :id AND tipo_conta = 'user')");
            $stmtResets->execute([':email' => $email, ':id' => $userId]);

            // Remove avaliações feitas pelo usuário
            $stmtAv = $pdo->prepare("DELETE FROM avaliacoes WHERE usuario_id = :id");
            $stmtAv->execute([':id' => $userId]);

            // Remove coletas solicitadas pelo usuário
            $stmtColetas = $pdo->prepare("DELETE FROM coletas WHERE usuario_id = :id");
            $stmtColetas->execute([':id' => $userId]);

            // Deleta o cadastro do usuário
            $stmtDel = $pdo->prepare("DELETE FROM usuarios WHERE id = :id");
            $stmtDel->execute([':id' => $userId]);
        }
    }

    $pdo->commit();

    // Encerra a sessão PHP completamente
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        session_destroy();
    }

    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }

    sendJsonResponse([
        'success' => true,
        'message' => 'Seu cadastro foi excluído permanentemente da plataforma EcoCall.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse(['error' => 'Falha ao processar a exclusão da conta: ' . $e->getMessage()], 500);
}
