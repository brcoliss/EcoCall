# 🌿 EcoCall — Documentação do Projeto & Registro de Alterações (Changelog)

Bem-vindo à documentação oficial do **EcoCall** — Plataforma Web de Coleta Seletiva e Reciclagem.  
Este documento é o **ponto central de referência técnica**, reunindo o **Guia do CSS Global (Design System)** e o **Log de Alterações (Changelog)**, que será continuamente atualizado a cada nova funcionalidade, refatoração ou ajuste implementado.

---

## 📌 1. Visão Geral do Projeto

- **Projeto:** EcoCall — Conectando cidadãos, geradores e empresas de reciclagem.
- **Tecnologias Frontend:** HTML5, JavaScript (Vanilla ES6+), CSS3 (Design Tokens, CSS Grid, Flexbox).
- **Tecnologias Backend:** PHP 8+ (Arquitetura RESTful / JSON APIs).
- **Banco de Dados:** MySQL / MariaDB (`ecocall_db` via XAMPP Apache).
- **Fontes Primárias:** `Plus Jakarta Sans` (Títulos e Display) & `Manrope` (Corpo de Texto).

---

## 🎨 2. Arquitetura do CSS Global & Design System

O estilo global do projeto é centralizado no arquivo [`css/shared.css`](file:///c:/xampp/htdocs/EcoCall/css/shared.css). Toda e qualquer modificação em elementos base, tokens visuais, componentes globais e animações deve ser feita ou documentada neste núcleo.

### 2.1. Tokens Globais (`:root`)

```css
:root {
    /* Paleta Eco Green (Principais) */
    --g900: #0d2415; /* Fundo principal dark / auth */
    --g800: #14331f;
    --g700: #1d472b;
    --g600: #27613a;
    --g500: #32804d;
    --g400: #46a566;
    --g300: #67c985; /* Destaque verde claro */
    --g200: #8adca3;
    --g100: #c7efd3;
    --g50:  #f3fbf5; /* Fundo de badges e cards leves */

    /* Cor de Ação / Accent */
    --ac: #52d67b;

    /* Cores Neutras */
    --white:    #ffffff;
    --gray-100: #f0f4f1;
    --gray-200: #dde4df;
    --gray-400: #8ba392;
    --gray-600: #4a6454;

    /* Textos */
    --text:      #0d1f14;
    --text-dark: #0d1f14;
    --textl:     #5a7066;

    /* Tipografia */
    --font-display: 'Plus Jakarta Sans', sans-serif;
    --font-body:    'Manrope', sans-serif;
}
```

---

### 2.2. Ambientes de Página (Contextos Globais de Body)

Para garantir consistência entre páginas com temas diferentes (escuro para autenticação/landing e claro para dashboards intra-sistema), utilize as seguintes classes no `<body>`:

| Contexto | Classe CSS no `<body>` | Fundo / Estilo Base | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| **Dark / Auth** | `body.auth-page` | Background `--g900` escuro com suporte a navbar translúcida, grids e blobs abstratos. | `ecocall-login.html`, `ecocall_cadastro.html` |
| **Light / Dashboard** | `body.dash-page` | Background `#f6f8f6` suave e tipografia `#1f2a22`. | `dashboard_empresa.html`, `ecocall-dashbord_usuario.html` |

---

### 2.3. Componentes CSS Globais Reutilizáveis

Os componentes abaixo estão declarados em [`css/shared.css`](file:///c:/xampp/htdocs/EcoCall/css/shared.css) e disponíveis em todas as telas:

1. **Tela de Carregamento (`.loading-screen`)**:
   - Elemento fixo em tela cheia com spinner animado (`.loading-spinner`).
   - Ativado dinamicamente via classe `.is-active`.
2. **Notificação Toast (`.toast`)**:
   - Fixo na parte inferior central da tela, arredondado (`border-radius: 50px`), com animação de subida (`fadeIn` + `translateY`).
   - Ativado via classe `.toast.show`.
3. **Tags & Badges (`.etag`, `.badge-count`)**:
   - Estilização padronizada para categorias de materiais, status e contadores de alertas.
4. **Animações Globais**:
   - `@keyframes spin`: Rotação contínua de 360°.
   - `@keyframes pulse`: Pulso de opacidade de 100% a 30%.
   - `@keyframes floatY`: Flutuação suave no eixo Y.
   - `@keyframes fadeIn`: Suavização de entrada subindo 8px.

---

### 2.4. Mapeamento de Arquivos CSS do Projeto

| Arquivo CSS | Escopo & Responsabilidade |
| :--- | :--- |
| [`css/shared.css`](file:///c:/xampp/htdocs/EcoCall/css/shared.css) | Tokens visuais, reset, animações, toasts, modal de loading e estilos base de body. |
| [`css/ecocall-home.css`](file:///c:/xampp/htdocs/EcoCall/css/ecocall-home.css) | Estilos da landing page pública, banners hero, estatísticas e footer. |
| [`css/ecocall-login.css`](file:///c:/xampp/htdocs/EcoCall/css/ecocall-login.css) | Card de autenticação, inputs modernos e links de redefinição. |
| [`css/ecocall_cadastro.css`](file:///c:/xampp/htdocs/EcoCall/css/ecocall_cadastro.css) | Wizard de cadastro em 3 etapas (Cidadão / Empresa), barra de força de senha. |
| [`css/ecocall-dashboard.css`](file:///c:/xampp/htdocs/EcoCall/css/ecocall-dashboard.css) | Layout do painel do usuário cidadão, cards de métricas e tabelas de solicitações. |
| [`css/empresa-pages.css`](file:///c:/xampp/htdocs/EcoCall/css/empresa-pages.css) | Painel corporativo da empresa coletora, mapas de rotas e radar de agendamentos. |
| [`css/minhas-coletas.css`](file:///c:/xampp/htdocs/EcoCall/css/minhas-coletas.css) | Histórico de coletas, filtros por data/status, modais de detalhes e avaliações. |

---

## 📜 3. Log de Alterações do Projeto (Changelog)

### 🗓️ [14/08/2026] — Segurança Reforçada: Ativação por Link de E-mail (Anti-Robô), Recuperação de Senha Multi-Canal (E-mail & SMS) e Validação Estrita de E-mails
- **[Ativação de Conta & Anti-Robô]**:
  - Toda nova conta é registrada com status `pendente_ativacao` e `email_verificado = 0`.
  - Geração de token criptográfico único (`bin2hex(random_bytes(32))`) e link de validação (`ecocall-ativar.html?token=...`) com validade de 24 horas.
  - Bloqueio de login para contas pendentes com endpoint de ativação [`api/auth/activate.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/activate.php) e reenvio de token via [`api/auth/resend_activation.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/resend_activation.php).
  - Criação da página visual dedicada [`ecocall-ativar.html`](file:///c:/xampp/htdocs/EcoCall/ecocall-ativar.html).
- **[Recuperação de Senha Multi-Canal (E-mail & SMS)]**:
  - Nova tabela `password_resets` no MySQL para controle de tokens numéricos de 6 dígitos com expiração de 15 minutos e proteção contra reuso.
  - Endpoints [`api/auth/forgot_password.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/forgot_password.php) e [`api/auth/reset_password.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/reset_password.php).
  - Modal interativo moderno na tela de login ([`ecocall-login.html`](file:///c:/xampp/htdocs/EcoCall/ecocall-login.html) e [`js/ecocall-login.js`](file:///c:/xampp/htdocs/EcoCall/js/ecocall-login.js)) com alternância entre canais (E-mail / SMS), máscara de proteção de dados e redefinição com criptografia Bcrypt.
- **[Validação Estrita de E-mails Reais & Existentes]**:
  - Função centralizada `validarEmailReal($email)` em [`api/config/db.php`](file:///c:/xampp/htdocs/EcoCall/api/config/db.php): valida sintaxe RFC, lista negra de e-mails descartáveis/temporários (*disposable emails*) e verificação de servidores de e-mail via DNS (MX/A).
  - Aplicada no cadastro ([`api/auth/register.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/register.php)), login ([`api/auth/login.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/login.php)), atualização de perfil ([`api/auth/update_profile.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/update_profile.php)) e recuperação de senha.

---

### 🗓️ [14/08/2026] — Conclusão das Fases 1, 2, 3 e 4: Painéis Dinâmicos, Avaliações, Mapa Leaflet & Segurança
- **[Fase 1: Backend & Segurança Reforçada]**:
  - [`api/coletas/update.php`](file:///c:/xampp/htdocs/EcoCall/api/coletas/update.php): Sincronização em memória de `$coleta['empresa_id']`, controle de permissões por tipo de usuário e incremento automático de métricas (`coletas_concluidas`, pontuação).
  - [`api/empresas/index.php`](file:///c:/xampp/htdocs/EcoCall/api/empresas/index.php): Seeding condicional (`COUNT(*) === 0`), eliminando re-execução de hashes de senha e escritas redundantes no banco de dados.
  - [`api/config/db.php`](file:///c:/xampp/htdocs/EcoCall/api/config/db.php): Proteção de sessões com `HttpOnly`, `use_only_cookies` e verificação de `headers_sent()` antes do envio de cabeçalhos JSON.
  - [`api/auth/login.php`](file:///c:/xampp/htdocs/EcoCall/api/auth/login.php): Regeneração de ID de sessão com `session_regenerate_id(true)` para prevenção de vulnerabilidade de Session Fixation.
  - [`api/coletas/sse.php`](file:///c:/xampp/htdocs/EcoCall/api/coletas/sse.php): Cálculo determinístico de integridade de status de coletas via checksum `GROUP_CONCAT`.
  - [`api/dashboard/stats.php`](file:///c:/xampp/htdocs/EcoCall/api/dashboard/stats.php): Agregação de estatísticas corporativas (pedidos pendentes, agendados, concluídos, cancelados, CO2 evitado, nota média e Top 5 clientes).
- **[Fase 2: Conexão Dinâmica do Painel Corporativo da Empresa]**:
  - [`dashboard_empresa.html`](file:///c:/xampp/htdocs/EcoCall/dashboard_empresa.html) & [`js/dashboard_empresa.js`](file:///c:/xampp/htdocs/EcoCall/js/dashboard_empresa.js):
    - Aba **Painel**: Listagem de novos pedidos com botões diretos de aceitar/recusar.
    - Aba **Pedidos**: Tabela filtrável por status (Novos, Em andamento, Concluídos, Recusados) e busca em tempo real por cliente, protocolo ou resíduo.
    - Aba **Agendamentos**: Calendário interativo mensal gerado via JS com marcação de dias com eventos (`has-event`, `today`, `selected`) e exibição de roteiro diário da equipe.
    - Aba **Relatórios**: Gráficos dinâmicos de barras de coletas por mês, distribuição de tipos de resíduos e ranking dos Top Clientes atendidos.
    - Aba **Meu Perfil**: Formulário cadastral corporativo sincronizado com o banco MySQL.
- **[Fase 3: Módulo de Avaliações & Mapa Interativo]**:
  - [`api/avaliacoes/index.php`](file:///c:/xampp/htdocs/EcoCall/api/avaliacoes/index.php) & [`api/avaliacoes/create.php`](file:///c:/xampp/htdocs/EcoCall/api/avaliacoes/create.php): Criação e listagem de avaliações com notas de 1 a 5 estrelas, comentários, recálculo de nota média da empresa e bônus de +10 pontos ao cidadão.
  - [`ecocall-dashbord_usuario.html`](file:///c:/xampp/htdocs/EcoCall/ecocall-dashbord_usuario.html) & [`js/ecocall-dashboard.js`](file:///c:/xampp/htdocs/EcoCall/js/ecocall-dashboard.js):
    - Aba **Ver no Mapa**: Mapa interativo integrado com Leaflet.js exibindo marcadores de cooperativas e ecopontos em Santos com popups para agendamento direto.
    - Modal de Avaliação: Permite ao cidadão avaliar coletas concluídas e ganhar pontuação ecológica.
    - Aba **Histórico**: Timeline visual de ações, coletas e pontuações obtidas.
- **[Fase 4: Limpeza, Refatoração & Validação]**:
  - Remoção de duplicações de código em `js/ecocall-dashboard.js`.
  - Verificação de sintaxe de 100% dos arquivos PHP com retorno limpo (0 erros).

---

### 🗓️ [12/08/2026 – 13/08/2026] — Identificação por Protocolo, Emissão de PDF (FPDF com AutoPrint) e Atualização de Relatórios via SSE (Server-Sent Events)
- **[Motor de PDF / FPDF]** ([`api/lib/fpdf.php`](file:///c:/xampp/htdocs/EcoCall/api/lib/fpdf.php)):
  - Implementação da biblioteca FPDF 1.86 em PHP puro com extensão AutoPrint para ativação automática da caixa de diálogo de impressão do navegador (`window.print()`).
- **[Comprovante por Protocolo]** ([`api/coletas/pdf.php`](file:///c:/xampp/htdocs/EcoCall/api/coletas/pdf.php)):
  - Endpoint dinâmico que gera ordens de serviço / comprovantes em PDF contendo número do protocolo, status, dados do cliente cidadão, dados da empresa parceira, especificações do resíduo e hash de autenticação digital.
- **[Atualização em Tempo Real / SSE]** ([`api/coletas/sse.php`](file:///c:/xampp/htdocs/EcoCall/api/coletas/sse.php)):
  - Conexão Server-Sent Events (`text/event-stream`) que monitora o banco MySQL e transmite atualizações de status de protocolos diretamente para os relatórios e painéis dos usuários e empresas sem necessidade de recarregar a página.
- **[Integração Frontend]** ([`js/core.js`](file:///c:/xampp/htdocs/EcoCall/js/core.js) & [`js/minhas-coletas.js`](file:///c:/xampp/htdocs/EcoCall/js/minhas-coletas.js)):
  - Adicionadas as funções `imprimirComprovantePDF(protocolo)` e `initColetasSSE()` para disparo de impressões em PDF e escuta em tempo real no cliente.
- **[Base de Dados / Empresas de Santos-SP]** ([`api/empresas/index.php`](file:///c:/xampp/htdocs/EcoCall/api/empresas/index.php)):
  - Mapeamento e auto-seeding das empresas, cooperativas cadastradas pela SEMAM e consórcios reais de coleta seletiva que atuam na cidade de Santos-SP (Terra Santos Ambiental, ONG Sem Fronteiras, Comares, Alquimista Reciclagem, Recimar, Fundação Settaport, Reciclar é Viver, Santista Ambiental).
- **[Consolidação JavaScript / SPA]** ([`js/ecocall-dashboard.js`](file:///c:/xampp/htdocs/EcoCall/js/ecocall-dashboard.js)):
  - Fusão e consolidação integral de toda a lógica do finado `minhas-coletas.js` dentro do script unificado do dashboard (`js/ecocall-dashboard.js`).
  - Remoção definitiva do arquivo obsoleto `js/minhas-coletas.js` do projeto.
- **[Correção do Esquema do Banco / Soluções de Erro]** ([`api/config/db.php`](file:///c:/xampp/htdocs/EcoCall/api/config/db.php)):
  - Adicionada autocorreção dinâmica de colunas para a tabela `coletas` no MySQL (`ALTER TABLE coletas ADD COLUMN protocolo`), eliminando o erro PDOException 1054 e restaurando 100% o salvamento de solicitações.
- **[Correção no Gerador FPDF / PHP 8+]** ([`api/lib/fpdf.php`](file:///c:/xampp/htdocs/EcoCall/api/lib/fpdf.php)):
  - Correção da ordem de inicialização do fator de escala (`$this->k`) e adição dos métodos `SetLineWidth()` e controle de flags `InHeader`/`InFooter` no FPDF.
  - Vinculação estrita do objeto `/Resources 2 0 R` de fontes e envio direto de operadores `SetTextColor` e `/F Tf` no stream PDF, tornando todos os textos, títulos e tabelas 100% visíveis no comprovante.

---

### 🗓️ [12/08/2026] — Unificação do Painel do Usuário em Container Único (SPA)
- **[Arquitetura / Frontend]** ([`ecocall-dashbord_usuario.html`](file:///c:/xampp/htdocs/EcoCall/ecocall-dashbord_usuario.html)):
  - Unificação de todas as abas do usuário (**Painel**, **Minhas Coletas**, **Empresas Salvas**, **Ver no Mapa**, **Histórico**) em um container SPA único.
  - Eliminação do recarregamento de página ao navegar, garantindo que os dados do usuário logado e o estado de logout permaneçam 100% ativos, consistentes e sem dados estáticos.
- **[Scripts]** ([`js/ecocall-dashboard.js`](file:///c:/xampp/htdocs/EcoCall/js/ecocall-dashboard.js)):
  - Implementado o controle `switchUserTab(tabName)` para alternar exibições e títulos da topbar dinamicamente.
- **[Limpeza de Código / HTML]**:
  - Remoção definitiva do arquivo obsoleto `minhas-coletas.html`, centralizando 100% da visualização e gerenciamento das coletas no painel unificado `ecocall-dashbord_usuario.html`.
- **[Padronização de Dados / Sessão]**:
  - Eliminação de todos os nomes estáticos de demonstração em templates HTML/JS. Exibição estrita e exclusiva do nome cadastrado no banco de dados MySQL para o usuário logado em todas as abas e componentes.

---

### 🗓️ [12/08/2026] — Refatoração do Painel do Usuário & Sincronização Dinâmica do Perfil (Sidebar/Topbar)
- **[Frontend / JS]** ([`js/core.js`](file:///c:/xampp/htdocs/EcoCall/js/core.js)):
  - Implementadas as funções globais `syncUserProfile()` e `applyUserDataToDOM()`.
  - Persistência instantânea via `sessionStorage` para eliminar o retorno aos dados estáticos ("João Silva", "joao@email.com", "JS") ao navegar entre o painel e **Minhas Coletas** (`minhas-coletas.html`).
  - Sincronização dinâmica de iniciais do avatar, nome, e-mail e localização (Cidade/UF) da sessão ativa em todas as páginas do sistema.
- **[Interface / HTML]** ([`minhas-coletas.html`](file:///c:/xampp/htdocs/EcoCall/minhas-coletas.html)):
  - Atribuição dos elementos dinâmicos `#dash-sidebar-avatar`, `#dash-sidebar-name`, `#dash-sidebar-email` e `#dash-topbar-city`.
- **[Módulo de Perfil Integrado]**:
  - Integração do perfil diretamente nos painéis de usuário (`js/ecocall-dashboard.js`) e empresa (`js/dashboard_empresa.js`), eliminando arquivos legados separados.

---

### 🗓️ [12/08/2026] — Criação da Documentação Oficial & Mapeamento do CSS Global
- **[CSS Global / Doc]**:
  - Estruturação do `README.md` unificado contendo o Guia de Design System, Tokens Globais e Histórico de Mudanças.
  - Mapeamento completo dos arquivos CSS em [`css/`](file:///c:/xampp/htdocs/EcoCall/css) e padronização dos ambientes `auth-page` e `dash-page`.
  - Formalização do procedimento de registro contínuo para atualizações futuras.

---

### 🗓️ [07/08/2026 – 08/08/2026] — Rearquitetura do Banco de Dados & APIs REST
- **[Banco de Dados]** (`api/config/schema.sql`):
  - Criação da tabela independente `empresas` com chave única para `cnpj` e `razao_social`.
  - Desmembração dos campos de endereço em `cep`, `tipo_logradouro`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade` e `uf`.
- **[Backend PHP]**:
  - `api/auth/register.php`: Suporte a cadastro de cidadão e empresa com Bcrypt e sessão automática.
  - `api/auth/login.php`: Autenticação unificada com fallback entre `usuarios` e `empresas`.
  - Endpoints `me.php`, `coletas/index.php` e `dashboard/stats.php` atualizados.
- **[Frontend / JS]** (`ecocall_cadastro.html` & `js/ecocall_cadastro.js`):
  - Wizard em 3 etapas para cadastro corporativo.
  - Integração com API ViaCEP para autopreenchimento de endereço e foco automático no número.
  - Integração com API IBGE para carregamento dinâmico de municípios por UF.
- **[Documentação]**:
  - Formalização do Acordo de Nível de Serviço em [`SLA.md`](file:///c:/xampp/htdocs/EcoCall/SLA.md).

---

## 🛠️ 4. Guia de Boas Práticas para Novas Alterações

Ao implementar novas funcionalidades ou modificar estilos no **EcoCall**, siga estas orientações:

1. **Alterações de CSS Global:**
   - Adicione novos tokens (cores, espaçamentos, sombras) no `:root` de [`css/shared.css`](file:///c:/xampp/htdocs/EcoCall/css/shared.css).
   - EVITE inline styles em elementos HTML; priorize classes descritivas.
2. **Atualização do README:**
   - Sempre que alterar um arquivo CSS, script ou endpoint PHP, adicione uma nova entrada na seção **`3. Log de Alterações do Projeto (Changelog)`** informando a data, o escopo (`[CSS Global]`, `[Backend]`, `[Frontend]`, etc.) e a descrição objetiva da mudança.
3. **Padrão de Links na Documentação:**
   - Utilize links clicáveis para arquivos do repositório (ex: [`css/shared.css`](file:///c:/xampp/htdocs/EcoCall/css/shared.css)).

---

*EcoCall — Sustentabilidade Inteligente & Coleta Seletiva.*
