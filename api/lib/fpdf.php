<?php
/* ==========================================================================
   EcoCall — Biblioteca FPDF 1.86 (Gerador de Documentos PDF em PHP Puro)
   Com suporte a Auto-Print (Impressão Automática no Navegador)
   ========================================================================== */

if (!class_exists('FPDF')) {

define('FPDF_VERSION', '1.86');

class FPDF
{
    protected $page;
    protected $n;
    protected $offsets;
    protected $buffer;
    protected $pages;
    protected $state;
    protected $compress;
    protected $k;
    protected $DefOrientation;
    protected $CurOrientation;
    protected $StdPageSizes;
    protected $DefPageSize;
    protected $CurPageSize;
    protected $CurRotation;
    protected $PageInfo;
    protected $wPt, $hPt;
    protected $w, $h;
    protected $lMargin;
    protected $tMargin;
    protected $rMargin;
    protected $bMargin;
    protected $cMargin;
    protected $x, $y;
    protected $lasth;
    protected $LineWidth;
    protected $fontpath;
    protected $CoreFonts;
    protected $fonts;
    protected $FontFiles;
    protected $encodings;
    protected $cmaps;
    protected $FontFamily;
    protected $FontStyle;
    protected $underline;
    protected $CurrentFont;
    protected $FontSizePt;
    protected $FontSize;
    protected $DrawColor;
    protected $FillColor;
    protected $TextColor;
    protected $ColorFlag;
    protected $WithAlpha;
    protected $ws;
    protected $images;
    protected $PageLinks;
    protected $links;
    protected $AutoPageBreak;
    protected $PageBreakTrigger;
    protected $InHeader;
    protected $InFooter;
    protected $ZoomMode;
    protected $LayoutMode;
    protected $metadata;
    protected $PDFVersion;
    protected $javascript;

    public function __construct($orientation='P', $unit='mm', $size='A4')
    {
        $this->k = $unit === 'pt' ? 1 : ($unit === 'mm' ? 72/25.4 : ($unit === 'cm' ? 72/2.54 : 72));
        $this->_doinit();
        $this->StdPageSizes = array('a3'=>array(841.89,1190.55), 'a4'=>array(595.28,841.89), 'a5'=>array(420.94,595.28),
            'letter'=>array(612,792), 'legal'=>array(612,1008));
        $size = $this->_getpagesize($size);
        $this->DefPageSize = $size;
        $this->CurPageSize = $size;
        $orientation = strtolower($orientation);
        if ($orientation === 'p' || $orientation === 'portrait') {
            $this->DefOrientation = 'P';
            $this->w = $size[0];
            $this->h = $size[1];
        } elseif ($orientation === 'l' || $orientation === 'landscape') {
            $this->DefOrientation = 'L';
            $this->w = $size[1];
            $this->h = $size[0];
        } else {
            $this->Error('Incorrect orientation: '.$orientation);
        }
        $this->CurOrientation = $this->DefOrientation;
        $this->wPt = $this->w*$this->k;
        $this->hPt = $this->h*$this->k;
        $this->CurRotation = 0;
        $this->lMargin = 10;
        $this->tMargin = 10;
        $this->rMargin = 10;
        $this->bMargin = 20;
        $this->cMargin = 1;
        $this->LineWidth = .567/$this->k;
        $this->SetAutoPageBreak(true, 20);
        $this->SetDisplayMode('default');
        $this->compress = true;
        $this->PDFVersion = '1.3';
    }

    protected function _doinit()
    {
        if (empty($this->k)) {
            $this->k = 72/25.4;
        }
        $this->page = 0;
        $this->n = 2;
        $this->buffer = '';
        $this->pages = array();
        $this->PageInfo = array();
        $this->state = 0;
        $this->fonts = array();
        $this->FontFiles = array();
        $this->encodings = array();
        $this->cmaps = array();
        $this->images = array();
        $this->links = array();
        $this->InHeader = false;
        $this->InFooter = false;
        $this->FontFamily = '';
        $this->FontStyle = '';
        $this->FontSizePt = 12;
        $this->FontSize = 12/$this->k;
        $this->LineWidth = .2835;
        $this->DrawColor = '0 G';
        $this->FillColor = '0 g';
        $this->TextColor = '0 g';
        $this->ColorFlag = false;
        $this->ws = 0;
        $this->javascript = '';
        $this->CoreFonts = array('courier', 'helvetica', 'times', 'symbol', 'zapfdingbats');
    }

    public function SetMargins($left, $top, $right=null)
    {
        $this->lMargin = $left;
        $this->tMargin = $top;
        $this->rMargin = ($right===null) ? $left : $right;
    }

    public function SetLeftMargin($margin)
    {
        $this->lMargin = $margin;
        if ($this->page>0 && $this->x<$margin) $this->x = $margin;
    }

    public function SetTopMargin($margin) { $this->tMargin = $margin; }
    public function SetRightMargin($margin) { $this->rMargin = $margin; }

    public function SetLineWidth($width)
    {
        $this->LineWidth = $width;
        if ($this->page > 0)
            $this->_out(sprintf('%.2F w', $width * $this->k));
    }

    public function SetAutoPageBreak($auto, $margin=0)
    {
        $this->AutoPageBreak = $auto;
        $this->bMargin = $margin;
        $this->PageBreakTrigger = $this->h-$margin;
    }

    public function SetDisplayMode($zoom, $layout='default')
    {
        $this->ZoomMode = $zoom;
        $this->LayoutMode = $layout;
    }

    public function AddPage($orientation='', $size='', $rotation=0)
    {
        if ($this->state===0) $this->Open();
        $family = $this->FontFamily;
        $style = $this->FontStyle.($this->underline ? 'U' : '');
        $fontsize = $this->FontSizePt;
        $lw = $this->LineWidth;
        $dc = $this->DrawColor;
        $fc = $this->FillColor;
        $tc = $this->TextColor;
        $cf = $this->ColorFlag;

        if ($this->page>0) {
            $this->InFooter = true;
            $this->Footer();
            $this->InFooter = false;
            $this->_endpage();
        }

        $this->_beginpage($orientation, $size, $rotation);
        $this->_out('2 J');
        $this->LineWidth = $lw;
        $this->_out(sprintf('%.2F w', $lw*$this->k));
        if ($family) $this->SetFont($family, $style, $fontsize);
        $this->DrawColor = $dc;
        if ($dc!=='0 G') $this->_out($dc);
        $this->FillColor = $fc;
        if ($fc!=='0 g') $this->_out($fc);
        $this->TextColor = $tc;
        $this->ColorFlag = $cf;
        $this->InHeader = true;
        $this->Header();
        $this->InHeader = false;
        if ($this->LineWidth!==$lw) {
            $this->LineWidth = $lw;
            $this->_out(sprintf('%.2F w', $lw*$this->k));
        }
        if ($family) $this->SetFont($family, $style, $fontsize);
        if ($this->DrawColor!==$dc) {
            $this->DrawColor = $dc;
            $this->_out($dc);
        }
        if ($this->FillColor!==$fc) {
            $this->FillColor = $fc;
            $this->_out($fc);
        }
        $this->TextColor = $tc;
        $this->ColorFlag = $cf;
    }

    public function Header() {}
    public function Footer() {}

    public function PageNo() { return $this->page; }

    public function SetDrawColor($r, $g=null, $b=null)
    {
        if (($r==0 && $g==0 && $b==0) || $g===null)
            $this->DrawColor = sprintf('%.3F G', $r/255);
        else
            $this->DrawColor = sprintf('%.3F %.3F %.3F RG', $r/255, $g/255, $b/255);
        if ($this->page>0) $this->_out($this->DrawColor);
    }

    public function SetFillColor($r, $g=null, $b=null)
    {
        if (($r==0 && $g==0 && $b==0) || $g===null)
            $this->FillColor = sprintf('%.3F g', $r/255);
        else
            $this->FillColor = sprintf('%.3F %.3F %.3F rg', $r/255, $g/255, $b/255);
        $this->ColorFlag = ($this->FillColor!=$this->TextColor);
        if ($this->page>0) $this->_out($this->FillColor);
    }

    public function SetTextColor($r, $g=null, $b=null)
    {
        if (($r==0 && $g==0 && $b==0) || $g===null)
            $this->TextColor = sprintf('%.3F g', $r/255);
        else
            $this->TextColor = sprintf('%.3F %.3F %.3F rg', $r/255, $g/255, $b/255);
        $this->ColorFlag = ($this->FillColor!=$this->TextColor);
        if ($this->page>0) $this->_out($this->TextColor);
    }

    public function GetStringWidth($s)
    {
        $s = (string)$s;
        $cw = &$this->CurrentFont['cw'];
        $w = 0;
        $l = strlen($s);
        for ($i=0; $i<$l; $i++)
            $w += isset($cw[$s[$i]]) ? ord($cw[$s[$i]]) : 500;
        return $w*$this->FontSize/1000;
    }

    public function SetFontSize($size)
    {
        $this->FontSizePt = $size;
        $this->FontSize = $size/$this->k;
        if ($this->page>0 && isset($this->CurrentFont))
            $this->_out(sprintf('BT /F%d %.2F Tf ET', $this->CurrentFont['i'], $this->FontSizePt));
    }

    public function SetFont($family, $style='', $size=0)
    {
        if ($family==='') $family = $this->FontFamily;
        else $family = strtolower($family);
        if ($family === 'arial') $family = 'helvetica';

        $style = strtoupper($style);
        if (strpos($style,'U')!==false) {
            $this->underline = true;
            $style = str_replace('U', '', $style);
        } else {
            $this->underline = false;
        }
        if ($style==='IB') $style = 'BI';
        if ($size==0) $size = $this->FontSizePt;

        if (!in_array($family, $this->CoreFonts)) {
            $family = 'helvetica';
        }

        $fontkey = $family.$style;
        if (!isset($this->fonts[$fontkey])) {
            $this->_loadcorefont($fontkey, $family, $style);
        }
        $this->FontFamily = $family;
        $this->FontStyle = $style;
        $this->CurrentFont = &$this->fonts[$fontkey];
        $this->SetFontSize($size);
    }

    protected function _loadcorefont($fontkey, $family, $style)
    {
        $i = count($this->fonts)+1;
        $name = array(
            'courier'=>'Courier', 'courierB'=>'Courier-Bold', 'courierI'=>'Courier-Oblique', 'courierBI'=>'Courier-BoldOblique',
            'helvetica'=>'Helvetica', 'helveticaB'=>'Helvetica-Bold', 'helveticaI'=>'Helvetica-Oblique', 'helveticaBI'=>'Helvetica-BoldOblique',
            'times'=>'Times-Roman', 'timesB'=>'Times-Bold', 'timesI'=>'Times-Italic', 'timesBI'=>'Times-BoldItalic',
            'symbol'=>'Symbol', 'zapfdingbats'=>'ZapfDingbats'
        );
        $this->fonts[$fontkey] = array('i'=>$i, 'type'=>'core', 'name'=>$name[$fontkey], 'up'=>-100, 'ut'=>50, 'cw'=>$this->_getfontcw($fontkey));
    }

    protected function _getfontcw($fontkey)
    {
        static $cwCache = array();
        if (isset($cwCache[$fontkey])) return $cwCache[$fontkey];
        $arr = array();
        for ($i=0; $i<256; $i++) $arr[chr($i)] = 600;
        $cwCache[$fontkey] = $arr;
        return $arr;
    }

    public function Rect($x, $y, $w, $h, $style='')
    {
        $op = 'S';
        if ($style==='F') $op = 'f';
        elseif ($style==='FD' || $style==='DF') $op = 'B';
        $this->_out(sprintf('%.2F %.2F %.2F %.2F re %s', $x*$this->k, ($this->h-$y)*$this->k, $w*$this->k, -$h*$this->k, $op));
    }

    public function Line($x1, $y1, $x2, $y2)
    {
        $this->_out(sprintf('%.2F %.2F m %.2F %.2F l S', $x1*$this->k, ($this->h-$y1)*$this->k, $x2*$this->k, ($this->h-$y2)*$this->k));
    }

    public function Cell($w, $h=0, $txt='', $border=0, $ln=0, $align='', $fill=false, $link='')
    {
        $k = $this->k;
        if ($this->y+$h>$this->PageBreakTrigger && !$this->InHeader && !$this->InFooter && $this->AutoPageBreak) {
            $x = $this->x;
            $ws = $this->ws;
            if ($ws>0) {
                $this->ws = 0;
                $this->_out('0 Tw');
            }
            $this->AddPage($this->CurOrientation, $this->CurPageSize, $this->CurRotation);
            $this->x = $x;
            if ($ws>0) {
                $this->ws = $ws;
                $this->_out(sprintf('%.3F Tw', $ws*$k));
            }
        }
        if ($w==0) $w = $this->w-$this->rMargin-$this->x;
        $s = '';
        if ($fill || $border==1) {
            $op = $fill ? ($border==1 ? 'B' : 'f') : 'S';
            $s = sprintf('%.2F %.2F %.2F %.2F re %s ', $this->x*$k, ($this->h-$this->y)*$k, $w*$k, -$h*$k, $op);
        }
        if (is_string($border)) {
            $x = $this->x;
            $y = $this->y;
            if (strpos($border,'L')!==false) $s .= sprintf('%.2F %.2F m %.2F %.2F l S ', $x*$k, ($this->h-$y)*$k, $x*$k, ($this->h-($y+$h))*$k);
            if (strpos($border,'T')!==false) $s .= sprintf('%.2F %.2F m %.2F %.2F l S ', $x*$k, ($this->h-$y)*$k, ($x+$w)*$k, ($this->h-$y)*$k);
            if (strpos($border,'R')!==false) $s .= sprintf('%.2F %.2F m %.2F %.2F l S ', ($x+$w)*$k, ($this->h-$y)*$k, ($x+$w)*$k, ($this->h-($y+$h))*$k);
            if (strpos($border,'B')!==false) $s .= sprintf('%.2F %.2F m %.2F %.2F l S ', $x*$k, ($this->h-($y+$h))*$k, ($x+$w)*$k, ($this->h-($y+$h))*$k);
        }
        if ($txt!=='') {
            if ($align==='R') $dx = $w-$this->cMargin-$this->GetStringWidth($txt);
            elseif ($align==='C') $dx = ($w-$this->GetStringWidth($txt))/2;
            else $dx = $this->cMargin;
            $fontIdx = isset($this->CurrentFont['i']) ? $this->CurrentFont['i'] : 1;
            $txt2 = str_replace(')', '\\)', str_replace('(', '\\(', str_replace('\\', '\\\\', $txt)));
            $s .= sprintf('BT /F%d %.2F Tf %.2F %.2F Td (%s) ET', $fontIdx, $this->FontSizePt, ($this->x+$dx)*$k, ($this->h-($this->y+.5*$h+.3*$this->FontSize))*$k, $txt2);
            if ($this->underline) $s .= ' '.$this->_dounderline($this->x+$dx, $this->y+.5*$h+.3*$this->FontSize, $txt);
        }
        if ($s) $this->_out($s);
        $this->lasth = $h;
        if ($ln>0) {
            $this->y += $h;
            if ($ln==1) $this->x = $this->lMargin;
        } else $this->x += $w;
    }

    public function MultiCell($w, $h, $txt, $border=0, $align='J', $fill=false)
    {
        $cw = &$this->CurrentFont['cw'];
        if ($w==0) $w = $this->w-$this->rMargin-$this->x;
        $wmax = ($w-2*$this->cMargin)*1000/$this->FontSize;
        $s = str_replace("\r", '', $txt);
        $nb = strlen($s);
        if ($nb>0 && $s[$nb-1]=="\n") $nb--;
        $b = 0;
        if ($border) {
            if ($border==1) {
                $border = 'LRTB';
                $b = 'LRT';
                $b2 = 'LRB';
            } else {
                $b2 = '';
                if (strpos($border,'L')!==false) $b2 .= 'L';
                if (strpos($border,'R')!==false) $b2 .= 'R';
                if (strpos($border,'B')!==false) $b2 .= 'B';
                $b = strpos($border,'T')!==false ? $b2.'T' : $b2;
            }
        }
        $sep = -1;
        $i = 0;
        $j = 0;
        $l = 0;
        $ns = 0;
        $nl = 1;
        while ($i<$nb) {
            $c = $s[$i];
            if ($c=="\n") {
                $this->Cell($w, $h, substr($s, $j, $i-$j), $b, 2, $align, $fill);
                $i++;
                $sep = -1;
                $j = $i;
                $l = 0;
                $ns = 0;
                $nl++;
                if ($border && $nl==2) $b = $b2;
                continue;
            }
            if ($c==' ') {
                $sep = $i;
                $ns++;
            }
            $l += isset($cw[$c]) ? ord($cw[$c]) : 500;
            if ($l>$wmax) {
                if ($sep==-1) {
                    if ($i==$j) $i++;
                    $this->Cell($w, $h, substr($s, $j, $i-$j), $b, 2, $align, $fill);
                } else {
                    $this->Cell($w, $h, substr($s, $j, $sep-$j), $b, 2, $align, $fill);
                    $i = $sep+1;
                }
                $sep = -1;
                $j = $i;
                $l = 0;
                $ns = 0;
                $nl++;
                if ($border && $nl==2) $b = $b2;
            } else $i++;
        }
        if ($i!=$j) $this->Cell($w, $h, substr($s, $j, $i-$j), $b, 2, $align, $fill);
        $this->x = $this->lMargin;
    }

    public function Ln($h=null)
    {
        $this->x = $this->lMargin;
        if ($h===null) $this->y += $this->lasth;
        else $this->y += $h;
    }

    public function GetX() { return $this->x; }
    public function SetX($x) { if ($x>=0) $this->x = $x; else $this->x = $this->w+$x; }
    public function GetY() { return $this->y; }
    public function SetY($y) { if ($y>=0) $this->y = $y; else $this->y = $this->h+$y; }
    public function SetXY($x, $y) { $this->SetY($y); $this->SetX($x); }

    public function Output($dest='', $name='', $isUTF8=false)
    {
        if ($this->state<3) $this->Close();
        if (empty($name)) $name = 'doc.pdf';
        if (empty($dest)) $dest = 'I';

        switch (strtoupper($dest)) {
            case 'I':
                $this->_checkoutput();
                header('Content-Type: application/pdf');
                header('Content-Disposition: inline; filename="'.$name.'"');
                header('Cache-Control: private, max-age=0, must-revalidate');
                header('Pragma: public');
                echo $this->buffer;
                break;
            case 'D':
                $this->_checkoutput();
                header('Content-Type: application/x-download');
                header('Content-Disposition: attachment; filename="'.$name.'"');
                header('Cache-Control: private, max-age=0, must-revalidate');
                header('Pragma: public');
                echo $this->buffer;
                break;
            case 'S':
                return $this->buffer;
            case 'F':
                $f = fopen($name, 'wb');
                if (!$f) $this->Error('Unable to create output file: '.$name);
                fwrite($f, $this->buffer, strlen($this->buffer));
                fclose($f);
                break;
            default:
                $this->Error('Incorrect output destination: '.$dest);
        }
        return '';
    }

    public function AutoPrint($dialog=true)
    {
        // Extension for auto-printing PDF in browsers
        $param = $dialog ? 'true' : 'false';
        $script = "print({bUI: {$param}, bSilent: false, bShrinkToFit: true});";
        $this->IncludeJS($script);
    }

    public function IncludeJS($script)
    {
        $this->javascript = $script;
    }

    protected function _checkoutput()
    {
        if (PHP_SAPI!=='cli') {
            if (headers_sent($file, $line))
                $this->Error("Some data has already been output, can't send PDF file (output started at $file:$line)");
        }
    }

    protected function Open() { $this->state = 1; }

    protected function Close()
    {
        if ($this->state===3) return;
        if ($this->page===0) $this->AddPage();
        $this->Footer();
        $this->_endpage();
        $this->_enddoc();
    }

    protected function _getpagesize($size)
    {
        if (is_string($size)) {
            $a = strtolower($size);
            if (!isset($this->StdPageSizes[$a])) $this->Error('Unknown page size: '.$size);
            return array($this->StdPageSizes[$a][0]/$this->k, $this->StdPageSizes[$a][1]/$this->k);
        } else {
            if ($size[0]>$size[1]) return array($size[1], $size[0]);
            else return $size;
        }
    }

    protected function _beginpage($orientation, $size, $rotation)
    {
        $this->page++;
        $this->pages[$this->page] = '';
        $this->state = 2;
        $this->x = $this->lMargin;
        $this->y = $this->tMargin;
        $this->FontFamily = '';
        if ($orientation==='') $orientation = $this->DefOrientation;
        else $orientation = strtoupper($orientation[0]);
        if ($size==='') $size = $this->DefPageSize;
        else $size = $this->_getpagesize($size);

        if ($orientation!=$this->CurOrientation || $size[0]!=$this->CurPageSize[0] || $size[1]!=$this->CurPageSize[1]) {
            if ($orientation==='P') {
                $this->w = $size[0];
                $this->h = $size[1];
            } else {
                $this->w = $size[1];
                $this->h = $size[0];
            }
            $this->wPt = $this->w*$this->k;
            $this->hPt = $this->h*$this->k;
            $this->PageBreakTrigger = $this->h-$this->bMargin;
            $this->CurOrientation = $orientation;
            $this->CurPageSize = $size;
        }
    }

    protected function _endpage() { $this->state = 1; }

    protected function _dounderline($x, $y, $txt)
    {
        $w = $this->GetStringWidth($txt)+$this->ws*substr_count($txt, ' ');
        return sprintf('%.2F %.2F %.2F %.2F re f', $x*$this->k, ($this->h-($y-$this->CurrentFont['up']/1000*$this->FontSize))*$this->k, $w*$this->k, -$this->CurrentFont['ut']/1000*$this->FontSizePt);
    }

    protected function _out($s)
    {
        if ($this->state===2) $this->pages[$this->page] .= $s."\n";
        else $this->buffer .= $s."\n";
    }

    protected function Error($msg)
    {
        throw new Exception('FPDF error: '.$msg);
    }

    protected function _enddoc()
    {
        $this->_putheader();
        $this->_putpages();
        $this->_putresources();

        // Print AutoJS Action if present
        $jsObj = 0;
        if (!empty($this->javascript)) {
            $this->_newobj();
            $jsObj = $this->n;
            $this->_out('<<');
            $this->_out('/S /JavaScript');
            $this->_out('/JS '.$this->_textstring($this->javascript));
            $this->_out('>>');
            $this->_out('endobj');
        }

        // Info
        $this->_newobj();
        $this->_out('<<');
        $this->_out('/Producer '.$this->_textstring('EcoCall FPDF Engine'));
        $this->_out('/CreationDate '.$this->_textstring('D:'.date('YmdHis')));
        $this->_out('>>');
        $this->_out('endobj');

        // Catalog
        $this->_newobj();
        $this->_out('<<');
        $this->_out('/Type /Catalog');
        $this->_out('/Pages 1 0 R');
        if ($jsObj > 0) {
            $this->_out('/OpenAction '.$jsObj.' 0 R');
        }
        $this->_out('>>');
        $this->_out('endobj');

        // Cross-ref
        $o = strlen($this->buffer);
        $this->_out('xref');
        $this->_out('0 '.($this->n+1));
        $this->_out('0000000000 65535 f ');
        for ($i=1; $i<=$this->n; $i++) {
            $off = isset($this->offsets[$i]) ? $this->offsets[$i] : 0;
            $this->_out(sprintf('%010d 00000 n ', $off));
        }
        $this->_out('trailer');
        $this->_out('<<');
        $this->_out('/Size '.($this->n+1));
        $this->_out('/Root '.$this->n.' 0 R');
        $this->_out('/Info '.($this->n-1).' 0 R');
        $this->_out('>>');
        $this->_out('startxref');
        $this->_out($o);
        $this->_out('%%EOF');
        $this->state = 3;
    }

    protected function _newobj()
    {
        $this->n++;
        $this->offsets[$this->n] = strlen($this->buffer);
        $this->_out($this->n.' 0 obj');
    }

    protected function _putheader() { $this->_out('%PDF-1.3'); }

    protected function _putpages()
    {
        $nb = $this->page;
        for ($n=1; $n<=$nb; $n++) {
            $this->_newobj();
            $this->_out('<</Type /Page');
            $this->_out('/Parent 1 0 R');
            $this->_out(sprintf('/MediaBox [0 0 %.2F %.2F]', $this->wPt, $this->hPt));
            $this->_out('/Resources 2 0 R');
            $this->_out('/Contents '.($this->n+1).' 0 R>>');
            $this->_out('endobj');
            $this->_newobj();
            $p = $this->pages[$n];
            $this->_out('<< /Length '.strlen($p).' >>');
            $this->_out('stream');
            $this->_out($p);
            $this->_out('endstream');
            $this->_out('endobj');
        }
        $this->offsets[1] = strlen($this->buffer);
        $this->_out('1 0 obj');
        $this->_out('<</Type /Pages');
        $kids = '/Kids [';
        for ($i=0; $i<$nb; $i++) $kids .= (3+2*$i).' 0 R ';
        $this->_out($kids.']');
        $this->_out('/Count '.$nb);
        $this->_out('>>');
        $this->_out('endobj');
    }

    protected function _putresources()
    {
        $this->offsets[2] = strlen($this->buffer);
        $this->_out('2 0 obj');
        $this->_out('<<');
        $this->_out('/Font <<');
        foreach ($this->fonts as $font) {
            $this->_out('/F'.$font['i'].' << /Type /Font /Subtype /Type1 /BaseFont /'.$font['name'].' >>');
        }
        $this->_out('>>');
        $this->_out('>>');
        $this->_out('endobj');
    }

    protected function _textstring($s)
    {
        return '('.str_replace(')', '\\)', str_replace('(', '\\(', str_replace('\\', '\\\\', $s))).')';
    }
}

}
