SET NAMES utf8mb4;

-- Cada vez é uma palavra da partida: quem está na vez escolhe, e os outros adivinham ao mesmo tempo.
CREATE TABLE IF NOT EXISTS vezes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sala_id INT UNSIGNED NOT NULL,
  numero SMALLINT UNSIGNED NOT NULL,
  rodada TINYINT UNSIGNED NOT NULL,
  escolhedor_id INT UNSIGNED NOT NULL,
  palavra VARCHAR(30) NULL,
  dica VARCHAR(80) NULL,
  comeca_em DATETIME(3) NOT NULL,
  escolhida_em DATETIME(3) NULL,
  terminou_em DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_vezes_sala_numero UNIQUE (sala_id, numero),
  CONSTRAINT fk_vezes_sala FOREIGN KEY (sala_id) REFERENCES salas (id) ON DELETE CASCADE,
  -- Se quem escolhe sai da sala, a vez dele some e a partida segue para o próximo.
  CONSTRAINT fk_vezes_escolhedor FOREIGN KEY (escolhedor_id) REFERENCES participantes (id) ON DELETE CASCADE,
  CONSTRAINT ck_vezes_rodada CHECK (rodada BETWEEN 1 AND 5),
  CONSTRAINT ck_vezes_palavra CHECK (
    palavra IS NULL
    OR (CHAR_LENGTH(palavra) >= 3 AND REGEXP_LIKE(palavra, '^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+([ -][A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+)*$', 'c'))
  ),
  CONSTRAINT ck_vezes_escolhida CHECK ((palavra IS NULL) = (escolhida_em IS NULL)),
  CONSTRAINT ck_vezes_terminou CHECK (terminou_em IS NULL OR palavra IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- A ordem do id é a ordem dos chutes: ela diz quem acertou primeiro.
CREATE TABLE IF NOT EXISTS letras_chutadas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vez_id INT UNSIGNED NOT NULL,
  participante_id INT UNSIGNED NOT NULL,
  letra CHAR(1) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_letras_chutadas_vez_participante_letra UNIQUE (vez_id, participante_id, letra),
  CONSTRAINT fk_letras_chutadas_vez FOREIGN KEY (vez_id) REFERENCES vezes (id) ON DELETE CASCADE,
  CONSTRAINT fk_letras_chutadas_participante FOREIGN KEY (participante_id) REFERENCES participantes (id) ON DELETE CASCADE,
  CONSTRAINT ck_letras_chutadas_letra CHECK (letra BETWEEN 'A' AND 'Z')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
