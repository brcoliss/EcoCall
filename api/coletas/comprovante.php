<?php
/* ==========================================================================
   EcoCall — Endpoint API: Dados Completos do Comprovante Digital Oficial
   (GET /api/coletas/comprovante.php?protocolo=ECO-XXX ou ?id=12)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';

$protocolo = trim($_GET['protocolo'] ?? $_GET['p'] ?? '');
$coletaId = intval($_GET['id'] ?? 0);

if (empty($protocolo) && $coletaId <= 0) {
    sendJsonResponse(['error' => 'Informe o número do protocolo (?protocolo=ECO-XXX) ou o ID da coleta (?id=12).'], 400);
}

$pdo = getDBConnection();

$stmt = $pdo->prepare("
    SELECT c.*,
           u.nome as cliente_nome, u.cpf as cliente_cpf, u.email as cliente_email, u.telefone as cliente_telefone,
           u.cidade as cliente_cidade, u.uf as cliente_uf, u.bairro as cliente_bairro,
           e.razao_social as empresa_nome, e.cnpj as empresa_cnpj, e.email as empresa_email,
           e.telefone as empresa_telefone, e.categoria as empresa_categoria, e.cidade as empresa_cidade, e.uf as empresa_uf
    FROM coletas c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN empresas e ON c.empresa_id = e.id
    WHERE c.protocolo = :proto OR c.id = :id
    LIMIT 1
");

$stmt->execute([':proto' => $protocolo, ':id' => $coletaId]);
$coleta = $stmt->fetch();

if (!$coleta) {
    sendJsonResponse(['error' => 'Nenhuma coleta localizada com o identificador informado.'], 404);
}

$protoStr = !empty($coleta['protocolo']) ? $coleta['protocolo'] : ('COL-' . str_pad($coleta['id'], 6, '0', STR_PAD_LEFT));
$peso = floatval($coleta['peso_estimado_kg'] ?? 0);

// Cálculo de impacto ecológico estimado baseado no peso
$co2EvitadoKg = round($peso * 1.85, 2);
$litrosAguaPoupados = round($peso * 26.4, 1);
$arvoresSalvas = round($peso * 0.015, 3);

$hashAuth = strtoupper(md5($protoStr . ($coleta['created_at'] ?? '2026') . 'ECOCALL_SANTOS_AUTH'));
$hashFormatado = chunk_split($hashAuth, 4, '-');
$hashFormatado = rtrim($hashFormatado, '-');

sendJsonResponse([
    'success' => true,
    'comprovante' => [
        'id' => $coleta['id'],
        'protocolo' => $protoStr,
        'status' => $coleta['status'] ?? 'agendado',
        'tipo_residuo' => $coleta['tipo_residuo'] ?? 'Resíduos Recicláveis',
        'peso_estimado_kg' => $peso,
        'data_agendada' => $coleta['data_agendada'] ?? date('Y-m-d'),
        'turno' => $coleta['turno'] ?? 'Manhã',
        'endereco_coleta' => $coleta['endereco_coleta'] ?? 'Santos/SP',
        'observacoes' => $coleta['observacoes'] ?? '',
        'created_at' => $coleta['created_at'] ?? date('Y-m-d H:i:s'),
        'hash_autenticacao' => $hashFormatado,
        'impacto' => [
            'co2_evitado_kg' => $co2EvitadoKg,
            'litros_agua' => $litrosAguaPoupados,
            'arvores_salvas' => $arvoresSalvas
        ],
        'cliente' => [
            'nome' => $coleta['cliente_nome'] ?? 'Cidadão de Santos',
            'cpf' => $coleta['cliente_cpf'] ?? '',
            'email' => $coleta['cliente_email'] ?? '',
            'telefone' => $coleta['cliente_telefone'] ?? '',
            'cidade' => $coleta['cliente_cidade'] ?? 'Santos',
            'uf' => $coleta['cliente_uf'] ?? 'SP'
        ],
        'empresa' => [
            'nome' => $coleta['empresa_nome'] ?? 'Cooperativa Credenciada de Santos',
            'cnpj' => $coleta['empresa_cnpj'] ?? '',
            'email' => $coleta['empresa_email'] ?? '',
            'telefone' => $coleta['empresa_telefone'] ?? '',
            'categoria' => $coleta['empresa_categoria'] ?? 'Coleta Seletiva',
            'cidade' => $coleta['empresa_cidade'] ?? 'Santos',
            'uf' => $coleta['empresa_uf'] ?? 'SP'
        ]
    ]
]);
