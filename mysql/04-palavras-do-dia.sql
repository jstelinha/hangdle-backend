SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS palavras_do_dia (
  dia DATE NOT NULL,
  palavra_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (dia),
  KEY ix_palavras_do_dia_palavra (palavra_id),
  CONSTRAINT fk_palavras_do_dia_palavra FOREIGN KEY (palavra_id) REFERENCES palavras (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
