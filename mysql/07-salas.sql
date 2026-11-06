SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS salas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dono_id INT UNSIGNED NOT NULL,
  nome VARCHAR(40) NOT NULL,
  senha_hash CHAR(60) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lista_id INT UNSIGNED NULL,
  segundos_por_rodada SMALLINT UNSIGNED NOT NULL DEFAULT 90,
  rodadas TINYINT UNSIGNED NOT NULL DEFAULT 2,
  maximo_de_jogadores TINYINT UNSIGNED NOT NULL DEFAULT 6,
  situacao ENUM('esperando', 'jogando', 'encerrada') NOT NULL DEFAULT 'esperando',
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_salas_situacao (situacao),
  CONSTRAINT fk_salas_dono FOREIGN KEY (dono_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  -- Apagar a lista não apaga a sala: ela continua, e o jogador da vez escreve a palavra.
  CONSTRAINT fk_salas_lista FOREIGN KEY (lista_id) REFERENCES listas (id) ON DELETE SET NULL,
  CONSTRAINT ck_salas_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 2),
  CONSTRAINT ck_salas_senha_bcrypt CHECK (senha_hash IS NULL OR senha_hash REGEXP '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$'),
  CONSTRAINT ck_salas_segundos CHECK (segundos_por_rodada IN (45, 90, 120)),
  CONSTRAINT ck_salas_rodadas CHECK (rodadas BETWEEN 1 AND 5),
  CONSTRAINT ck_salas_maximo CHECK (maximo_de_jogadores BETWEEN 2 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Rubrica de Back-end - Cruds Completos - Ao menos 1 relacionamento entre os recursos
CREATE TABLE IF NOT EXISTS participantes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sala_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  apelido VARCHAR(20) NOT NULL,
  pontos INT UNSIGNED NOT NULL DEFAULT 0,
  entrou_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT uq_participantes_sala_usuario UNIQUE (sala_id, usuario_id),
  CONSTRAINT uq_participantes_sala_apelido UNIQUE (sala_id, apelido),
  CONSTRAINT fk_participantes_sala FOREIGN KEY (sala_id) REFERENCES salas (id) ON DELETE CASCADE,
  CONSTRAINT fk_participantes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT ck_participantes_apelido CHECK (CHAR_LENGTH(TRIM(apelido)) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DELIMITER $$

CREATE TRIGGER trg_participantes_sala_cheia BEFORE INSERT ON participantes
FOR EACH ROW
BEGIN
  IF (SELECT COUNT(*) FROM participantes WHERE sala_id = NEW.sala_id)
     >= (SELECT maximo_de_jogadores FROM salas WHERE id = NEW.sala_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sala cheia';
  END IF;
END$$

CREATE TRIGGER trg_salas_maximo_edicao BEFORE UPDATE ON salas
FOR EACH ROW
BEGIN
  IF NEW.maximo_de_jogadores < (SELECT COUNT(*) FROM participantes WHERE sala_id = NEW.id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sala com mais jogadores que o maximo';
  END IF;
END$$

DELIMITER ;
