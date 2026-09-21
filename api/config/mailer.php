<?php
/* ==========================================================================
   EcoCall — Motor de Envio de E-mails (Resend API REST via HTTPS)
   ========================================================================== */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Carrega o autoloader do Composer para PHPMailer se necessário
if (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
    require_once __DIR__ . '/../../vendor/autoload.php';
}

// Carrega credenciais locais seguras (se existirem e não estiverem no Git)
if (file_exists(__DIR__ . '/mailer.local.php')) {
    require_once __DIR__ . '/mailer.local.php';
}

// =====================================================================
// 1. CONFIGURAÇÕES DA API RESEND (HTTPS REST)
// =====================================================================
if (!defined('RESEND_API_KEY')) {
    define('RESEND_API_KEY', getenv('RESEND_API_KEY') ?: 'SUA_CHAVE_RESEND_AQUI');
}
if (!defined('RESEND_FROM')) {
    // Domínio padrão de testes do Resend ou seu domínio verificado
    define('RESEND_FROM', getenv('RESEND_FROM') ?: 'EcoCall <onboarding@resend.dev>');
}

// =====================================================================
// 2. CONFIGURAÇÕES SMTP (Contingência e Envio Direto)
// =====================================================================
if (!defined('SMTP_HOST')) define('SMTP_HOST', 'smtp.gmail.com');
if (!defined('SMTP_PORT')) define('SMTP_PORT', 587);
if (!defined('SMTP_USER')) define('SMTP_USER', getenv('SMTP_USER') ?: 'seu_email@gmail.com');
if (!defined('SMTP_PASS')) define('SMTP_PASS', getenv('SMTP_PASS') ?: 'sua_senha_de_app');
if (!defined('SMTP_FROM')) define('SMTP_FROM', getenv('SMTP_FROM') ?: 'seu_email@gmail.com');
if (!defined('SMTP_FROM_NAME')) define('SMTP_FROM_NAME', 'EcoCall System');

/**
 * Envia e-mail via API REST do Resend (HTTPS cURL)
 *
 * @param string $para_email
 * @param string $para_nome
 * @param string $assunto
 * @param string $corpo_html
 * @param string $corpo_texto
 * @return array ['success' => bool, 'provider' => 'resend', 'error' => string|null, 'id' => string|null]
 */
function enviarViaResend($para_email, $para_nome, $assunto, $corpo_html, $corpo_texto = '') {
    $apiKey = trim(RESEND_API_KEY);
    if (empty($apiKey) || $apiKey === 'SUA_CHAVE_RESEND_AQUI') {
        return ['success' => false, 'provider' => 'resend', 'error' => 'Chave de API do Resend não configurada.'];
    }

    $payload = [
        'from' => RESEND_FROM,
        'to' => [$para_email],
        'subject' => $assunto,
        'html' => $corpo_html
    ];

    if (!empty($corpo_texto)) {
        $payload['text'] = $corpo_texto;
    } else {
        $payload['text'] = strip_tags(str_replace(['<br>', '<br/>', '</p>', '</div>'], "\n", $corpo_html));
    }

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['success' => false, 'provider' => 'resend', 'error' => 'Erro de conexão cURL com Resend: ' . $curlError];
    }

    $data = json_decode($response, true);

    if ($httpCode >= 200 && $httpCode < 300 && isset($data['id'])) {
        return [
            'success' => true,
            'provider' => 'resend',
            'id' => $data['id'],
            'error' => null
        ];
    }

    $msgErro = $data['message'] ?? ($data['error']['message'] ?? ('HTTP ' . $httpCode . ': ' . $response));
    return [
        'success' => false,
        'provider' => 'resend',
        'error' => 'Erro Resend (' . $httpCode . '): ' . $msgErro
    ];
}

/**
 * Envia e-mail via PHPMailer (SMTP)
 *
 * @param string $para_email
 * @param string $para_nome
 * @param string $assunto
 * @param string $corpo_html
 * @param string $corpo_texto
 * @return array ['success' => bool, 'provider' => 'smtp', 'error' => string|null]
 */
function enviarViaSMTP($para_email, $para_nome, $assunto, $corpo_html, $corpo_texto = '') {
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        return ['success' => false, 'provider' => 'smtp', 'error' => 'PHPMailer não está instalado ou autoloader ausente.'];
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;

        $mail->setLanguage('pt_br');
        $mail->CharSet = 'UTF-8';

        $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
        $mail->addAddress($para_email, $para_nome ?: '');

        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpo_html;
        
        if (!empty($corpo_texto)) {
            $mail->AltBody = $corpo_texto;
        } else {
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '</p>', '</div>'], "\n", $corpo_html));
        }

        $mail->send();
        return [
            'success' => true,
            'provider' => 'smtp',
            'error' => null
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'provider' => 'smtp',
            'error' => 'Erro SMTP: ' . $mail->ErrorInfo
        ];
    }
}

/**
 * Função Principal de Envio com Roteamento Inteligente e Fallback
 * Tenta enviar via Resend API. Se o Resend bloquear (ex: conta sandbox para e-mails externos),
 * envia automaticamente via SMTP do Gmail para garantir entrega imediata.
 *
 * @param string $para_email
 * @param string $para_nome
 * @param string $assunto
 * @param string $corpo_html
 * @param string $corpo_texto
 * @return array ['success' => bool, 'provider' => string, 'error' => string|null]
 */
function enviarEmail($para_email, $para_nome, $assunto, $corpo_html, $corpo_texto = '') {
    // 1. Tenta Resend se configurado
    if (defined('RESEND_API_KEY') && RESEND_API_KEY !== 'SUA_CHAVE_RESEND_AQUI' && !empty(trim(RESEND_API_KEY))) {
        $resResend = enviarViaResend($para_email, $para_nome, $assunto, $corpo_html, $corpo_texto);
        if ($resResend['success']) {
            return $resResend;
        }
        error_log("[EcoCall Mailer] Resend retornou: " . ($resResend['error'] ?? '') . ". Acionando fallback SMTP...");
    }

    // 2. Fallback SMTP (Gmail)
    $resSMTP = enviarViaSMTP($para_email, $para_nome, $assunto, $corpo_html, $corpo_texto);
    return $resSMTP;
}

/**
 * Gerador de Template HTML Responsivo e Moderno do EcoCall
 * Compatível com todos os clientes de e-mail (Gmail, Outlook, Yahoo, Apple Mail, etc.)
 *
 * @param string $titulo Título principal no topo do card
 * @param string $mensagemHtml Mensagem com formatação HTML
 * @param string|null $textoBotao Texto do botão principal (opcional)
 * @param string|null $linkBotao Link para onde o botão direciona (opcional)
 * @param string|null $codigoDestaque Código numérico/alfanumérico em destaque (opcional)
 * @return string HTML completo
 */
function gerarTemplateEmailEcoCall($titulo, $mensagemHtml, $textoBotao = null, $linkBotao = null, $codigoDestaque = null) {
    $anoAtual = date('Y');
    
    // Bloco do Código em Destaque (se houver)
    $blocoCodigo = '';
    if (!empty($codigoDestaque)) {
        $blocoCodigo = "
        <div style='margin: 25px 0; text-align: center;'>
            <div style='display: inline-block; background: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 16px 32px;'>
                <span style='font-family: Consolas, monospace, sans-serif; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #065f46;'>{$codigoDestaque}</span>
            </div>
            <p style='margin: 8px 0 0; font-size: 12px; color: #6b7280;'>Este código expira em 15 minutos.</p>
        </div>";
    }

    // Bloco do Botão Principal (se houver)
    $blocoBotao = '';
    $blocoFallbackLink = '';
    if (!empty($textoBotao) && !empty($linkBotao)) {
        $blocoBotao = "
        <div style='margin: 30px 0; text-align: center;'>
            <a href='{$linkBotao}' target='_blank' style='display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); text-align: center;'>
                {$textoBotao}
            </a>
        </div>";

        $blocoFallbackLink = "
        <div style='margin-top: 25px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280; line-height: 1.5; word-break: break-all;'>
            Se o botão acima não funcionar, copie e cole o seguinte endereço no seu navegador:<br>
            <a href='{$linkBotao}' style='color: #10b981; text-decoration: underline;'>{$linkBotao}</a>
        </div>";
    }

    return "
<!DOCTYPE html>
<html lang='pt-BR'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>{$titulo}</title>
</head>
<body style='margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;'>
    <table border='0' cellpadding='0' cellspacing='0' width='100%' style='table-layout: fixed; background-color: #f8fafc; padding: 40px 15px;'>
        <tr>
            <td align='center'>
                <!-- Container Central -->
                <table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 580px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0;'>
                    
                    <!-- Header com Logo / Identidade -->
                    <tr>
                        <td style='background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 30px; text-align: center;'>
                            <div style='display: inline-block;'>
                                <span style='font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;'>🌿 EcoCall</span>
                            </div>
                            <p style='margin: 6px 0 0; color: #d1fae5; font-size: 13px; font-weight: 500;'>Plataforma Inteligente de Coleta Seletiva</p>
                        </td>
                    </tr>

                    <!-- Conteúdo Principal -->
                    <tr>
                        <td style='padding: 36px 32px 28px;'>
                            <h1 style='margin: 0 0 18px; font-size: 20px; font-weight: 700; color: #0f172a;'>{$titulo}</h1>
                            
                            <div style='font-size: 15px; line-height: 1.65; color: #334155;'>
                                {$mensagemHtml}
                            </div>

                            {$blocoCodigo}
                            {$blocoBotao}
                            {$blocoFallbackLink}
                        </td>
                    </tr>

                    <!-- Rodapé de Segurança e Anti-Phishing -->
                    <tr>
                        <td style='background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;'>
                            <p style='margin: 0 0 6px; font-size: 12px; color: #94a3b8;'>
                                🔒 <strong>Mensagem de Segurança:</strong> O EcoCall nunca solicita sua senha ou dados confidenciais por e-mail.
                            </p>
                            <p style='margin: 0; font-size: 11px; color: #94a3b8;'>
                                &copy; {$anoAtual} EcoCall Brasil — Santos, SP. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
}
