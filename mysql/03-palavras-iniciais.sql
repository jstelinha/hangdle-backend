SET NAMES utf8mb4;

INSERT IGNORE INTO categorias (nome) VALUES
  ('Comida'), ('Animais'), ('Lugares'), ('Objetos'), ('Profissões'), ('Esportes');

SET @comida = (SELECT id FROM categorias WHERE nome = 'Comida');
SET @animais = (SELECT id FROM categorias WHERE nome = 'Animais');
SET @lugares = (SELECT id FROM categorias WHERE nome = 'Lugares');
SET @objetos = (SELECT id FROM categorias WHERE nome = 'Objetos');
SET @profissoes = (SELECT id FROM categorias WHERE nome = 'Profissões');
SET @esportes = (SELECT id FROM categorias WHERE nome = 'Esportes');

INSERT IGNORE INTO palavras (texto, categoria_id) VALUES
  ('ABACAXI', @comida), ('BRIGADEIRO', @comida), ('COXINHA', @comida), ('FEIJOADA', @comida),
  ('PÃO DE QUEIJO', @comida), ('MANDIOCA', @comida), ('PAMONHA', @comida), ('TAPIOCA', @comida),
  ('GOIABADA', @comida), ('MAÇÃ', @comida),

  ('CAPIVARA', @animais), ('TAMANDUÁ', @animais), ('JABUTI', @animais), ('ARARA', @animais),
  ('TUCANO', @animais), ('ONÇA', @animais), ('PREGUIÇA', @animais), ('BALEIA', @animais),
  ('GIRAFA', @animais), ('CAMALEÃO', @animais),

  ('CURITIBA', @lugares), ('SALVADOR', @lugares), ('MANAUS', @lugares), ('RECIFE', @lugares),
  ('PANTANAL', @lugares), ('AMAZÔNIA', @lugares), ('FORTALEZA', @lugares), ('GRAMADO', @lugares),
  ('BONITO', @lugares), ('OURO PRETO', @lugares),

  ('GUARDA-CHUVA', @objetos), ('TESOURA', @objetos), ('CADEIRA', @objetos), ('ESPELHO', @objetos),
  ('TRAVESSEIRO', @objetos), ('LANTERNA', @objetos), ('MOCHILA', @objetos), ('RELÓGIO', @objetos),
  ('PANELA', @objetos), ('CHAVEIRO', @objetos),

  ('BOMBEIRO', @profissoes), ('PROFESSORA', @profissoes), ('ENFERMEIRA', @profissoes), ('CARPINTEIRO', @profissoes),
  ('JORNALISTA', @profissoes), ('ASTRONAUTA', @profissoes), ('CONFEITEIRA', @profissoes), ('MOTORISTA', @profissoes),
  ('ARQUITETA', @profissoes), ('VETERINÁRIA', @profissoes),

  ('FUTEBOL', @esportes), ('VÔLEI', @esportes), ('CAPOEIRA', @esportes), ('NATAÇÃO', @esportes),
  ('BASQUETE', @esportes), ('SKATE', @esportes), ('XADREZ', @esportes), ('SURFE', @esportes),
  ('JUDÔ', @esportes), ('CICLISMO', @esportes);
