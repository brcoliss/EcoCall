<?php
/* ==========================================================================
   EcoCall — Server-Sent Events (SSE) Endpoint para Relatórios e Status
   (GET /api/coletas/sse.php)
   Transmite atualizações em tempo real quando a empresa altera status de protocolos.
   ========================================================================== */

// Configuração estrita de cabeçalhos SSE
header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');
header('X-Accel-Buffering: no');

// Desativa qualquer buffering de saída do PHP
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);
@ini_set('implicit_flush', 1);
while (ob_get_level() > 0) {
    ob_end_clean();
}

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();

$lastStateHash = '';
$maxExecutions = 25; // Limite de 50 segundos por conexão para estabilidade XAMPP
$counter = 0;

while ($counter < $maxExecutions) {
    if (connection_aborted()) {
        break;
    }

    try {
        // Consulta o estado consolidado das coletas e gera checksum de todos os status
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status='concluido' THEN 1 ELSE 0 END) as concluidas,
                   SUM(CASE WHEN status='agendado' THEN 1 ELSE 0 END) as agendadas,
                   SUM(CASE WHEN status='pendente' THEN 1 ELSE 0 END) as pendentes,
                   SUM(CASE WHEN status='cancelado' THEN 1 ELSE 0 END) as canceladas,
                   MAX(id) as max_id,
                   GROUP_CONCAT(CONCAT(id, ':', status) ORDER BY id DESC SEPARATOR '|') as status_checksum
            FROM coletas
        ");
        $stmt->execute();
        $stats = $stmt->fetch();

        // Consulta a última coleta
        $stmtLast = $pdo->prepare("
            SELECT c.id, c.protocolo, c.status, c.tipo_residuo, c.peso_estimado_kg, c.data_agendada,
                   u.nome as cliente_nome, e.razao_social as empresa_nome
            FROM coletas c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN empresas e ON c.empresa_id = e.id
            ORDER BY c.id DESC LIMIT 1
        ");
        $stmtLast->execute();
        $latest = $stmtLast->fetch();

        $checksumStr = ($stats['status_checksum'] ?? '') . '_' . ($stats['total'] ?? '0');
        $currentStateHash = md5($checksumStr);

        if ($lastStateHash === '') {
            $lastStateHash = $currentStateHash;

            $eventData = [
                'type' => 'initial_state',
                'timestamp' => date('Y-m-d H:i:s'),
                'stats' => [
                    'total' => intval($stats['total'] ?? 0),
                    'concluidas' => intval($stats['concluidas'] ?? 0),
                    'agendadas' => intval($stats['agendadas'] ?? 0),
                    'pendentes' => intval($stats['pendentes'] ?? 0)
                ],
                'latest' => $latest
            ];

            echo "event: initial_state\n";
            echo "data: " . json_encode($eventData, JSON_UNESCAPED_UNICODE) . "\n\n";
            flush();
        } elseif ($currentStateHash !== $lastStateHash) {
            $lastStateHash = $currentStateHash;

            $eventData = [
                'type' => 'status_updated',
                'timestamp' => date('Y-m-d H:i:s'),
                'stats' => [
                    'total' => intval($stats['total'] ?? 0),
                    'concluidas' => intval($stats['concluidas'] ?? 0),
                    'agendadas' => intval($stats['agendadas'] ?? 0),
                    'pendentes' => intval($stats['pendentes'] ?? 0)
                ],
                'latest' => $latest
            ];

            echo "event: status_updated\n";
            echo "data: " . json_encode($eventData, JSON_UNESCAPED_UNICODE) . "\n\n";
            flush();
        } else {
            // Heartbeat de manutenção da conexão SSE
            echo ": heartbeat " . date('H:i:s') . "\n\n";
            flush();
        }
    } catch (Exception $e) {
        echo "event: error\n";
        echo "data: " . json_encode(['error' => $e->getMessage()]) . "\n\n";
        flush();
        break;
    }

    sleep(2);
    $counter++;
}
