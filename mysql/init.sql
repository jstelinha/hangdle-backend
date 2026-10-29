-- Rubrica de Back-end - Cadastro de Usuário - Cadastro com os campos obrigatórios: nome, email, senha, CPF
CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  cpf CHAR(11) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  senha_hash CHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT uq_usuarios_cpf UNIQUE (cpf),
  CONSTRAINT ck_usuarios_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 3),
  CONSTRAINT ck_usuarios_email_minusculo CHECK (email = LOWER(email)),
  -- Rubrica de Back-end - Cadastro de Usuário - Validação de email
  CONSTRAINT ck_usuarios_email_formato CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$'),
  CONSTRAINT ck_usuarios_cpf_formato CHECK (cpf REGEXP '^[0-9]{11}$'),
  -- Rubrica de Back-end - Autenticação - Senha criptografada no banco
  CONSTRAINT ck_usuarios_senha_bcrypt CHECK (senha_hash REGEXP '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DELIMITER $$

-- Rubrica de Back-end - Cadastro de Usuário - Validação de CPF
CREATE FUNCTION cpf_valido(cpf CHAR(11)) RETURNS BOOLEAN
DETERMINISTIC NO SQL
BEGIN
  DECLARE soma INT DEFAULT 0;
  DECLARE posicao INT DEFAULT 1;
  DECLARE digito INT;

  IF cpf IS NULL OR cpf NOT REGEXP '^[0-9]{11}$' THEN
    RETURN FALSE;
  END IF;

  IF cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', '44444444444',
             '55555555555', '66666666666', '77777777777', '88888888888', '99999999999') THEN
    RETURN FALSE;
  END IF;

  WHILE posicao <= 9 DO
    SET soma = soma + CAST(SUBSTRING(cpf, posicao, 1) AS UNSIGNED) * (11 - posicao);
    SET posicao = posicao + 1;
  END WHILE;
  SET digito = (soma * 10) % 11;
  IF digito = 10 THEN
    SET digito = 0;
  END IF;
  IF digito <> CAST(SUBSTRING(cpf, 10, 1) AS UNSIGNED) THEN
    RETURN FALSE;
  END IF;

  SET soma = 0;
  SET posicao = 1;
  WHILE posicao <= 10 DO
    SET soma = soma + CAST(SUBSTRING(cpf, posicao, 1) AS UNSIGNED) * (12 - posicao);
    SET posicao = posicao + 1;
  END WHILE;
  SET digito = (soma * 10) % 11;
  IF digito = 10 THEN
    SET digito = 0;
  END IF;
  RETURN digito = CAST(SUBSTRING(cpf, 11, 1) AS UNSIGNED);
END$$

CREATE TRIGGER trg_usuarios_cpf_insercao BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
  IF NOT cpf_valido(NEW.cpf) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CPF invalido';
  END IF;
END$$

CREATE TRIGGER trg_usuarios_cpf_edicao BEFORE UPDATE ON usuarios
FOR EACH ROW
BEGIN
  IF NOT cpf_valido(NEW.cpf) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CPF invalido';
  END IF;
END$$

DELIMITER ;
