SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS categorias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_categorias_nome UNIQUE (nome),
  CONSTRAINT ck_categorias_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Rubrica de Back-end - Cruds Completos - Ao menos 1 relacionamento entre os recursos
CREATE TABLE IF NOT EXISTS palavras (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  texto VARCHAR(30) NOT NULL,
  categoria_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_palavras_texto UNIQUE (texto),
  CONSTRAINT fk_palavras_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT ck_palavras_tamanho CHECK (CHAR_LENGTH(texto) >= 3),
  CONSTRAINT ck_palavras_formato CHECK (
    REGEXP_LIKE(texto, '^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+([ -][A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+)*$', 'c')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
