<?php
/* ==========================================================================
   EcoCall — Gerador de Comprovante / PDF de Ordem de Serviço por Protocolo
   (GET /api/coletas/pdf.php?protocolo=XXX ou ?id=YYY&print=1)
   ========================================================================== */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../lib/fpdf.php';

$protocolo = trim($_GET['protocolo'] ?? $_GET['p'] ?? '');
$coletaId = intval($_GET['id'] ?? 0);
$shouldPrint = !empty($_GET['print']);

if (empty($protocolo) && $coletaId <= 0) {
    die("Erro: Informe o protocolo (?protocolo=ECO-XXX) ou o ID da coleta (?id=12).");
}

$pdo = getDBConnection();

$stmt = $pdo->prepare("
    SELECT c.*,
           u.nome as cliente_nome, u.cpf as cliente_cpf, u.email as cliente_email, u.telefone as cliente_telefone,
           u.cidade as cliente_cidade, u.uf as cliente_uf,
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
    die("Erro: Nenhuma coleta encontrada com o protocolo informado.");
}

$protoStr = !empty($coleta['protocolo']) ? $coleta['protocolo'] : ('COL-' . str_pad($coleta['id'], 6, '0', STR_PAD_LEFT));
$statusStr = strtoupper($coleta['status']);

// Instanciação da classe FPDF
class ColetaPDF extends FPDF
{
    public $protocoloNum;
    public $statusName;

    function txt($str)
    {
        return iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', (string)$str);
    }

    function Header()
    {
        // Banner Superior Verde Eco
        $this->SetFillColor(13, 36, 21); // --g900 (#0d2415)
        $this->Rect(0, 0, 210, 32, 'F');

        // Título EcoCall
        $this->SetFont('Helvetica', 'B', 18);
        $this->SetTextColor(82, 214, 123); // --ac (#52d67b)
        $this->SetXY(12, 8);
        $this->Cell(0, 8, $this->txt('EcoCall'), 0, 1, 'L');

        // Subtítulo
        $this->SetFont('Helvetica', '', 9);
        $this->SetTextColor(255, 255, 255);
        $this->SetXY(12, 18);
        $this->Cell(0, 5, $this->txt('Plataforma Web de Coleta Seletiva e Reciclagem'), 0, 1, 'L');

        // Caixa do Protocolo (Direita)
        $this->SetFont('Helvetica', 'B', 10);
        $this->SetTextColor(255, 255, 255);
        $this->SetXY(110, 8);
        $this->Cell(88, 6, $this->txt('PROTOCOLO: ' . $this->protocoloNum), 0, 1, 'R');

        $this->SetFont('Helvetica', 'B', 9);
        $this->SetTextColor(82, 214, 123);
        $this->SetXY(110, 16);
        $this->Cell(88, 6, $this->txt('STATUS: ' . $this->statusName), 0, 1, 'R');

        $this->Ln(15);
    }

    function Footer()
    {
        $this->SetY(-18);
        $this->SetFont('Helvetica', 'I', 8);
        $this->SetTextColor(120, 120, 120);
        $this->Cell(0, 5, $this->txt('EcoCall — Documento Oficial de Ordem de Serviço Emitido Eletronicamente via PHP FPDF.'), 0, 1, 'C');
        $this->Cell(0, 5, $this->txt('Página ' . $this->PageNo() . ' | Autenticidade verificada pelo sistema'), 0, 0, 'C');
    }
}

$pdf = new ColetaPDF('P', 'mm', 'A4');
$pdf->protocoloNum = $protoStr;
$pdf->statusName = $statusStr;

if ($shouldPrint) {
    $pdf->AutoPrint(true);
}

$pdf->SetMargins(12, 12, 12);
$pdf->AddPage();

// Título do Documento
$pdf->SetFont('Helvetica', 'B', 14);
$pdf->SetTextColor(13, 36, 21);
$pdf->Cell(0, 10, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', 'COMPROVANTE DE SOLICITAÇÃO & ORDEM DE SERVIÇO'), 0, 1, 'L');

$pdf->SetDrawColor(39, 97, 58);
$pdf->SetLineWidth(0.8);
$pdf->Line(12, 45, 198, 45);
$pdf->Ln(4);

// 1. DADOS DO CLIENTE CIDADÃO
$pdf->SetFillColor(243, 251, 245);
$pdf->SetFont('Helvetica', 'B', 10);
$pdf->SetTextColor(29, 71, 43);
$pdf->Cell(0, 7, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' 1. DADOS DO SOLICITANTE (CIDADÃO)'), 1, 1, 'L', true);

$pdf->SetFont('Helvetica', '', 9);
$pdf->SetTextColor(30, 30, 30);

$clienteNome = $coleta['cliente_nome'] ?: 'Cidadão Registrado';
$clienteCpf = $coleta['cliente_cpf'] ?: 'Não informado';
$clienteEmail = $coleta['cliente_email'] ?: 'Não informado';
$clienteTel = $coleta['cliente_telefone'] ?: 'Não informado';
$clienteEnd = $coleta['endereco_coleta'] ?: 'Endereço cadastrado';
$clienteCidade = ($coleta['cliente_cidade'] ?: 'Santos') . ' / ' . ($coleta['cliente_uf'] ?: 'SP');

$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' Nome: ' . $clienteNome), 'L', 0);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' CPF: ' . $clienteCpf), 'R', 1);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' E-mail: ' . $clienteEmail), 'L', 0);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' Telefone: ' . $clienteTel), 'R', 1);
$pdf->Cell(186, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' Município: ' . $clienteCidade), 'LR', 1);
$pdf->Cell(186, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' Endereço de Retirada: ' . $clienteEnd), 'LRB', 1);

$pdf->Ln(4);

// 2. DADOS DA EMPRESA COLETORA
$pdf->SetFillColor(243, 251, 245);
$pdf->SetFont('Helvetica', 'B', 10);
$pdf->SetTextColor(29, 71, 43);
$pdf->Cell(0, 7, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' 2. DADOS DA EMPRESA COLETORA PARCEIRA'), 1, 1, 'L', true);

$pdf->SetFont('Helvetica', '', 9);
$pdf->SetTextColor(30, 30, 30);

$empNome = $coleta['empresa_nome'] ?: 'EcoColeta Parceira';
$empCnpj = $coleta['empresa_cnpj'] ?: 'Isento / Cadastrado';
$empEmail = $coleta['empresa_email'] ?: 'contato@ecocall.com.br';
$empTel = $coleta['empresa_telefone'] ?: '(13) 3200-0000';
$empCat = $coleta['empresa_categoria'] ?: 'Reciclagem Geral';

$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' Razão Social: ' . $empNome), 'L', 0);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' CNPJ: ' . $empCnpj), 'R', 1);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' Contato / Tel: ' . $empTel), 'L', 0);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' Categoria: ' . $empCat), 'R', 1);
$pdf->Cell(186, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' E-mail Corporativo: ' . $empEmail), 'LRB', 1);

$pdf->Ln(4);

// 3. ESPECIFICAÇÕES DOS MATERIAIS & AGENDAMENTO
$pdf->SetFillColor(243, 251, 245);
$pdf->SetFont('Helvetica', 'B', 10);
$pdf->SetTextColor(29, 71, 43);
$pdf->Cell(0, 7, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', ' 3. ESPECIFICAÇÕES DA COLETA SELETIVA'), 1, 1, 'L', true);

$pdf->SetFont('Helvetica', '', 9);
$pdf->SetTextColor(30, 30, 30);

$rawDate = $coleta['data_agendada'];
$parts = explode('-', $rawDate);
$dateFmt = count($parts) === 3 ? $parts[2] . '/' . $parts[1] . '/' . $parts[0] : $rawDate;

$peso = number_format(floatval($coleta['peso_estimado_kg']), 1, ',', '.') . ' kg';
$turno = $coleta['turno'] ?: 'Manhã (08h - 12h)';
$obs = $coleta['observacoes'] ?: 'Nenhuma instrução adicional gravada.';

$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', ' Resíduos: ' . $coleta['tipo_residuo']), 'L', 0);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', ' Massa Estimada: ' . $peso), 'R', 1);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', ' Data Agendada: ' . $dateFmt), 'L', 0);
$pdf->Cell(93, 6, iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', ' Período / Turno: ' . $turno), 'R', 1);

$pdf->SetFont('Helvetica', '', 8);
$pdf->Cell(186, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', ' Instruções / Obs:'), 'LR', 1);
$pdf->MultiCell(186, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', ' ' . $obs), 'LRB', 'L');

$pdf->Ln(6);

// 4. AUTENTICAÇÃO DIGITAL & QR CODE SIMULADO
$pdf->SetFillColor(235, 245, 238);
$pdf->Rect(12, $pdf->GetY(), 186, 22, 'F');
$pdf->SetFont('Helvetica', 'B', 8);
$pdf->SetTextColor(27, 61, 38);
$pdf->SetXY(15, $pdf->GetY() + 2);
$pdf->Cell(0, 4, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', 'AUTENTICAÇÃO DIGITAL DE SEGURANÇA (ECOCALL VERIFIED)'), 0, 1);

$hashVal = strtoupper(md5($protoStr . $coleta['created_at'] . 'ECOCALL'));
$pdf->SetFont('Helvetica', '', 8);
$pdf->SetTextColor(80, 80, 80);
$pdf->SetX(15);
$pdf->Cell(0, 4, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', 'Código Hash: ' . chunk_split($hashVal, 4, '-')), 0, 1);
$pdf->SetX(15);
$pdf->Cell(0, 4, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', 'Data de Emissão: ' . date('d/m/Y H:i:s') . ' | Origem: Servidor MySQL XAMPP Apache'), 0, 1);

$pdf->Ln(12);

// 5. CAMPOS DE ASSINATURA DA ORDEM DE SERVIÇO
$pdf->SetFont('Helvetica', '', 8);
$pdf->SetTextColor(100, 100, 100);

$ySig = $pdf->GetY();
$pdf->Line(20, $ySig, 90, $ySig);
$pdf->Line(120, $ySig, 190, $ySig);

$pdf->SetXY(20, $ySig + 2);
$pdf->Cell(70, 4, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', 'Assinatura do Solicitante (Cidadão)'), 0, 0, 'C');

$pdf->SetXY(120, $ySig + 2);
$pdf->Cell(70, 4, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', 'Assinatura da Empresa Coletora'), 0, 1, 'C');

// Download ou Visualização Inline no Navegador
$filename = 'Comprovante_Coleta_' . $protoStr . '.pdf';
$pdf->Output('I', $filename);
