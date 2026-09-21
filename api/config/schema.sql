-- Schema SQL do Banco de Dados EcoCall (MySQL)

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    cpf VARCHAR(20) DEFAULT NULL,
    telefone VARCHAR(20) DEFAULT NULL,
    cep VARCHAR(10) DEFAULT NULL,
    tipo_logradouro VARCHAR(20) DEFAULT 'Rua',
    logradouro VARCHAR(150) DEFAULT NULL,
    numero VARCHAR(20) DEFAULT NULL,
    complemento VARCHAR(100) DEFAULT NULL,
    bairro VARCHAR(100) DEFAULT NULL,
    cidade VARCHAR(100) DEFAULT NULL,
    uf VARCHAR(2) DEFAULT NULL,
    endereco VARCHAR(255) DEFAULT NULL,
    tipo ENUM('user', 'empresa') NOT NULL DEFAULT 'user',
    pontos INT DEFAULT 0,
    status_conta ENUM('pendente_ativacao', 'ativo', 'bloqueado') NOT NULL DEFAULT 'pendente_ativacao',
    email_verificado TINYINT(1) NOT NULL DEFAULT 0,
    token_ativacao VARCHAR(64) DEFAULT NULL,
    token_ativacao_expira DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(150) NOT NULL,
    cnpj VARCHAR(25) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) DEFAULT NULL,
    cep VARCHAR(10) DEFAULT NULL,
    tipo_logradouro VARCHAR(20) DEFAULT 'Rua',
    logradouro VARCHAR(150) DEFAULT NULL,
    numero VARCHAR(20) DEFAULT NULL,
    complemento VARCHAR(100) DEFAULT NULL,
    bairro VARCHAR(100) DEFAULT NULL,
    cidade VARCHAR(100) DEFAULT 'Santos',
    uf VARCHAR(2) DEFAULT 'SP',
    endereco VARCHAR(255) DEFAULT NULL,
    categoria VARCHAR(100) DEFAULT 'Reciclagem Geral',
    descricao TEXT DEFAULT NULL,
    nota_media DECIMAL(3,2) DEFAULT 5.00,
    coletas_concluidas INT DEFAULT 0,
    status_conta ENUM('pendente_ativacao', 'ativo', 'bloqueado') NOT NULL DEFAULT 'pendente_ativacao',
    email_verificado TINYINT(1) NOT NULL DEFAULT 0,
    token_ativacao VARCHAR(64) DEFAULT NULL,
    token_ativacao_expira DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coletas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    empresa_id INT DEFAULT NULL,
    tipo_residuo VARCHAR(100) NOT NULL,
    peso_estimado_kg DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    data_agendada DATE NOT NULL,
    turno VARCHAR(20) NOT NULL DEFAULT 'Manhã',
    endereco_coleta TEXT NOT NULL,
    status ENUM('pendente', 'agendado', 'concluido', 'cancelado') NOT NULL DEFAULT 'pendente',
    observacoes TEXT DEFAULT NULL,
    protocolo VARCHAR(30) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coleta_id INT NOT NULL,
    usuario_id INT NOT NULL,
    empresa_id INT NOT NULL,
    nota INT NOT NULL DEFAULT 5,
    comentario TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coleta_id) REFERENCES coletas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conta_id INT DEFAULT NULL,
    identificador VARCHAR(150) NOT NULL,
    metodo ENUM('email', 'whatsapp', 'sms') NOT NULL DEFAULT 'email',
    codigo VARCHAR(10) NOT NULL,
    tipo_conta ENUM('user', 'empresa') NOT NULL DEFAULT 'user',
    utilizado TINYINT(1) NOT NULL DEFAULT 0,
    expira_em DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
