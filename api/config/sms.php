<?php
/* ==========================================================================
   EcoCall — Motor de Envio de SMS & WhatsApp (Twilio / Zenvia / Comtele / Direct WA)
   ========================================================================== */

if (file_exists(__DIR__ . '/sms.local.php')) {
    require_once __DIR__ . '/sms.local.php';
} elseif (file_exists(__DIR__ . '/mailer.local.php')) {
    require_once __DIR__ . '/mailer.local.php';
}

// 1. Provedor Padrão de SMS ('twilio', 'zenvia', 'comtele', 'whatsapp', 'simulado')
if (!defined('SMS_PROVIDER')) {
    define('SMS_PROVIDER', getenv('SMS_PROVIDER') ?: 'simulado');
}

// 2. Credenciais Twilio
if (!defined('TWILIO_ACCOUNT_SID')) define('TWILIO_ACCOUNT_SID', getenv('TWILIO_ACCOUNT_SID') ?: '');
if (!defined('TWILIO_AUTH_TOKEN'))  define('TWILIO_AUTH_TOKEN', getenv('TWILIO_AUTH_TOKEN') ?: '');
if (!defined('TWILIO_FROM_NUMBER')) define('TWILIO_FROM_NUMBER', getenv('TWILIO_FROM_NUMBER') ?: '');

// 3. Credenciais Zenvia
if (!defined('ZENVIA_API_TOKEN'))   define('ZENVIA_API_TOKEN', getenv('ZENVIA_API_TOKEN') ?: '');
if (!defined('ZENVIA_FROM_NAME'))   define('ZENVIA_FROM_NAME', getenv('ZENVIA_FROM_NAME') ?: 'EcoCall');

// 4. Credenciais Comtele
if (!defined('COMTELE_API_KEY'))    define('COMTELE_API_KEY', getenv('COMTELE_API_KEY') ?: '');

/**
 * Normaliza o número para formato internacional E.164 (ex: +5513998765432)
 */
function normalizarTelefoneE164($telefone) {
    $digits = preg_replace('/\D/', '', $telefone);
    if (empty($digits)) return '';
    
    // Se não tem DDI 55 (Brasil), adiciona
    if (strlen($digits) === 10 || strlen($digits) === 11) {
        $digits = '55' . $digits;
    }
    return '+' . $digits;
}

/**
 * Envia SMS via API Twilio
 */
function enviarViaTwilio($numeroDestino, $mensagem) {
    $sid = trim(TWILIO_ACCOUNT_SID);
    $token = trim(TWILIO_AUTH_TOKEN);
    $from = trim(TWILIO_FROM_NUMBER);

    if (empty($sid) || empty($token) || empty($from)) {
        return ['success' => false, 'provider' => 'twilio', 'error' => 'Credenciais do Twilio não configuradas.'];
    }

    $e164 = normalizarTelefoneE164($numeroDestino);
    $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";

    $postData = http_build_query([
        'To'   => $e164,
        'From' => $from,
        'Body' => $mensagem
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD => "{$sid}:{$token}",
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['success' => false, 'provider' => 'twilio', 'error' => 'Falha de conexão cURL: ' . $curlError];
    }

    $json = json_decode($response, true);
    if ($httpCode >= 200 && $httpCode < 300) {
        return ['success' => true, 'provider' => 'twilio', 'sid' => $json['sid'] ?? null];
    }

    return ['success' => false, 'provider' => 'twilio', 'error' => $json['message'] ?? "Erro HTTP {$httpCode} no Twilio."];
}

/**
 * Envia SMS via API Zenvia
 */
function enviarViaZenvia($numeroDestino, $mensagem) {
    $token = trim(ZENVIA_API_TOKEN);
    if (empty($token)) {
        return ['success' => false, 'provider' => 'zenvia', 'error' => 'Token da API Zenvia não configurado.'];
    }

    $digits = preg_replace('/\D/', '', $numeroDestino);
    if (strlen($digits) === 10 || strlen($digits) === 11) {
        $digits = '55' . $digits;
    }

    $payload = [
        'from'     => ZENVIA_FROM_NAME,
        'to'       => $digits,
        'contents' => [
            ['type' => 'text', 'text' => $mensagem]
        ]
    ];

    $ch = curl_init('https://api.zenvia.com/v2/channels/sms/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-API-TOKEN: ' . $token
        ],
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['success' => false, 'provider' => 'zenvia', 'error' => 'Falha cURL: ' . $curlError];
    }

    if ($httpCode >= 200 && $httpCode < 300) {
        return ['success' => true, 'provider' => 'zenvia'];
    }

    return ['success' => false, 'provider' => 'zenvia', 'error' => "Erro HTTP {$httpCode} na Zenvia: {$response}"];
}

/**
 * Função Unificada para Disparo de Mensagem SMS / WhatsApp
 *
 * @param string $numeroDestino
 * @param string $codigo
 * @param string $nomeDestinatario
 * @return array ['success' => bool, 'provider' => string, 'error' => string|null, 'whatsapp_link' => string, 'simulado' => bool]
 */
function enviarSMS($numeroDestino, $codigo, $nomeDestinatario = 'Cidadão') {
    $mensagem = "🌿 *EcoCall — Recuperação de Senha*\n\nOlá, *{$nomeDestinatario}*!\n\nRecebemos uma solicitação para redefinir sua senha de acesso. Utilize o código de segurança abaixo para prosseguir:\n\n🔑 *Código:* `{$codigo}`\n\n⏱️ _Este código expira em 15 minutos._";
    $provider = strtolower(SMS_PROVIDER);

    // Gera Link direto para WhatsApp Web / Mobile App
    $digits = preg_replace('/\D/', '', $numeroDestino);
    if (strlen($digits) === 10 || strlen($digits) === 11) {
        $digits = '55' . $digits;
    }
    $whatsappLink = "https://api.whatsapp.com/send?phone={$digits}&text=" . urlencode($mensagem);

    if ($provider === 'twilio' && !empty(TWILIO_ACCOUNT_SID)) {
        $res = enviarViaTwilio($numeroDestino, $mensagem);
        $res['whatsapp_link'] = $whatsappLink;
        $res['simulado'] = false;
        return $res;
    }

    if ($provider === 'zenvia' && !empty(ZENVIA_API_TOKEN)) {
        $res = enviarViaZenvia($numeroDestino, $mensagem);
        $res['whatsapp_link'] = $whatsappLink;
        $res['simulado'] = false;
        return $res;
    }

    // Modo Padrão / Simulado / Direct WhatsApp
    return [
        'success' => true,
        'provider' => 'simulado',
        'simulado' => true,
        'error' => null,
        'message' => 'Código gerado com sucesso.',
        'whatsapp_link' => $whatsappLink,
        'info' => 'Para envio de SMS real via operadoras de telefonia, configure uma chave de API de SMS (Twilio, Zenvia ou Comtele) em sms.local.php.'
    ];
}
