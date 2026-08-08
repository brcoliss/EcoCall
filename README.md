# EcoCall — Registro de Alterações do Projeto (Log de Desenvolvimento)

**Data:** 07/08/2026 — 08/08/2026  
**Projeto:** EcoCall — Plataforma Web de Coleta Seletiva e Reciclagem  
**Servidor:** XAMPP Apache / MySQL (`ecocall_db`)  

---

## 📌 Resumo Executivo das Alterações

Durante o ciclo de desenvolvimento de hoje, a plataforma **EcoCall** passou por melhorias de arquitetura de banco de dados, refatoração de endpoints PHP, reestruturação da interface de cadastro em 3 etapas com máscaras em tempo real, integração com APIs públicas brasileiras (IBGE e ViaCEP) e formalização do SLA do projeto.

---

## 🛠️ Detalhamento de Todas as Alterações Realizadas

### 1. 🗄️ Rearquitetura do Banco de Dados (`api/config/schema.sql`)
- **Tabela `empresas` Independente**: Criada uma tabela dedicada para contas corporativas separada da tabela `usuarios` (cidadãos).
- **Inclusão do CNPJ e Razão Social**: Campo `cnpj` com restrição `UNIQUE` e `razao_social`.
- **Separação Completa dos Campos de Endereço** (em `usuarios` e `empresas`):
  - `cep` (`VARCHAR(10)`)
  - `tipo_logradouro` (`Rua`, `Avenida`, `Alameda`, `Travessa`, `Praça`, `Rodovia`, `Estrada`, `Viela`, `Outro`)
  - `logradouro` (`VARCHAR(150)`) — Nome da via
  - `numero` (`VARCHAR(20)`) — Número do imóvel
  - `complemento` (`VARCHAR(100)`) — Apto, Sala, Bloco
  - `bairro` (`VARCHAR(100)`) — Nome do bairro
  - `cidade` (`VARCHAR(100)`) — Município
  - `uf` (`VARCHAR(2)`) — Sigla do Estado
  - `endereco` (`VARCHAR(255)`) — Endereço completo concatenado

---

### 2. ⚡ Endpoints PHP e Comunicação Backend

- **`api/auth/register.php`**:
  - Aceita requisições JSON de `user` (Cidadão) ou `empresa` (Corporativo).
  - Valida e grava `cnpj`, `razao_social`, `tipo_logradouro`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf` e `cep`.
  - Criptografia de senhas com `PASSWORD_DEFAULT` (Bcrypt).
  - Inicia sessão automática após o cadastro e retorna o caminho de redirecionamento (`dashboard_empresa.html` ou `ecocall-dashbord_usuario.html`).
- **`api/auth/login.php`**:
  - Tenta autenticar primeiro na tabela `usuarios` e, caso não localize, consulta a tabela `empresas`.
  - Configura variáveis de sessão (`user_id`, `empresa_id`, `nome`, `tipo`).
- **`api/auth/me.php`**, **`api/coletas/index.php`** e **`api/dashboard/stats.php`**:
  - Atualizados para suportar a consulta direta da tabela `empresas`.

---

### 3. 🌐 Interface Frontend e Wizard de Cadastro (`ecocall_cadastro.html` & `js/ecocall_cadastro.js`)

- **Wizard em 3 Etapas para Empresa**:
  - **Etapa 1**: Responsável, E-mail Corporativo e Senha com barra de força de senha em tempo real.
  - **Etapa 2**: Razão Social, CNPJ, Telefone/WhatsApp, Categoria e Endereço Completo.
  - **Etapa 3**: Confirmação com efeito de sucesso e redirecionamento automático ao painel.
- **Seleção Dinâmica de Estado (UF)**:
  - Menu `<select>` contendo a sigla dos **27 estados brasileiros** (`AC`, `AL`, `AP`, `AM`, `BA`, `CE`, `DF`, `ES`, `GO`, `MA`, `MT`, `MS`, `MG`, `PA`, `PB`, `PR`, `PE`, `PI`, `RJ`, `RN`, `RS`, `RO`, `RR`, `SC`, `SP`, `SE`, `TO`).
- **Preenchimento Dinâmico de Cidades (API IBGE)**:
  - Menu `<select id="emp-cidade">` e `<select id="user-cidade">`.
  - Consulta a API de localidades do **IBGE** (`servicodados.ibge.gov.br`) ao alterar o estado.
  - Possui fallback para dicionário offline com principais cidades brasileiras em caso de sem conexão.
- **Busca Automática via CEP (API ViaCEP)**:
  - Ao digitar 8 dígitos de CEP no campo `#emp-cep` ou `#user-cep`, consulta o webservice `https://viacep.com.br/ws/{cep}/json/`.
  - Autopreenche **Tipo de Logradouro**, **Logradouro**, **Bairro**, **UF** e **Cidade**, posicionando o foco do cursor direto no campo **Número**.

---

### 4. 📄 Documentação e SLA ([SLA.md](file:///c:/xampp/htdocs/EcoCall/SLA.md))

- **Acordo de Nível de Serviço (SLA)** criado e ativado para o projeto:
  - **Disponibilidade**: Meta de **99.5% Uptime** ao mês.
  - **Prazos Operacionais**: Confirmação de solicitações em até **4 horas úteis**.
  - **Severidades (S1 a S4)**: Definidos prazos de resposta (15min a 8h) e solução (2h a 48h).
  - **Qualidade de Serviço**: Avaliação média mínima de **4.0 / 5.0** para empresas parceiras.

---

## 🧪 Como Testar no Navegador

1. Certifique-se de que o **XAMPP Apache e MySQL** estão rodando.
2. Acesse a tela de cadastro:  
   👉 `http://localhost/EcoCall/ecocall_cadastro.html`
3. Alterne para a aba **Empresa**.
4. Teste a busca digitando um CEP (ex: `01310-100` ou `11000-000`).
