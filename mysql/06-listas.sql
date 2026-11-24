SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS listas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  nome VARCHAR(40) NOT NULL,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_listas_usuario_nome UNIQUE (usuario_id, nome),
  CONSTRAINT fk_listas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT ck_listas_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Rubrica de Back-end - Cruds Completos - Ao menos 1 relacionamento entre os recursos
CREATE TABLE IF NOT EXISTS palavras_das_listas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lista_id INT UNSIGNED NOT NULL,
  texto VARCHAR(30) NOT NULL,
  dica VARCHAR(80) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_palavras_das_listas_texto UNIQUE (lista_id, texto),
  CONSTRAINT fk_palavras_das_listas_lista FOREIGN KEY (lista_id) REFERENCES listas (id) ON DELETE CASCADE,
  CONSTRAINT ck_palavras_das_listas_tamanho CHECK (CHAR_LENGTH(texto) >= 3),
  CONSTRAINT ck_palavras_das_listas_formato CHECK (
    REGEXP_LIKE(texto, '^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+([ -][A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+)*$', 'c')
  ),
  CONSTRAINT ck_palavras_das_listas_dica CHECK (dica IS NULL OR CHAR_LENGTH(TRIM(dica)) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
