SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS resultados_diarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  dia DATE NOT NULL,
  letras VARCHAR(26) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  chutes TINYINT UNSIGNED AS (CHAR_LENGTH(letras)) STORED,
  erros TINYINT UNSIGNED NOT NULL,
  acertou BOOLEAN NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_resultados_usuario_dia UNIQUE (usuario_id, dia),
  KEY ix_resultados_dia (dia),
  CONSTRAINT fk_resultados_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_resultados_dia FOREIGN KEY (dia) REFERENCES palavras_do_dia (dia),
  CONSTRAINT ck_resultados_letras CHECK (REGEXP_LIKE(letras, '^[A-Z]+$', 'c')),
  CONSTRAINT ck_resultados_erros CHECK (erros <= 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
