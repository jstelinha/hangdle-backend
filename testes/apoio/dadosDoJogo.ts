import type { Connection, ResultSetHeader } from "mysql2/promise";

const HASH_VALIDO = "$2b$12$abcdefghijklmnopqrstuuMRjZ7c0Y3x5r4H9Fh7wJxX2nXxXxXxX";

export async function inserirUsuario(conexao: Connection, email = "larissa.teste@exemplo.com", cpf = "52998224725"): Promise<number> {
  const [resultado] = await conexao.execute<ResultSetHeader>(
    "INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ('Larissa Souza', ?, ?, ?)",
    [email, cpf, HASH_VALIDO],
  );
  return resultado.insertId;
}

export async function inserirPalavraDoDia(conexao: Connection, dia: string, texto = "MAÇÃ"): Promise<void> {
  const [categoria] = await conexao.execute<ResultSetHeader>(
    "INSERT INTO categorias (nome) VALUES ('Comida') ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
  );
  const [palavra] = await conexao.execute<ResultSetHeader>("INSERT INTO palavras (texto, categoria_id) VALUES (?, ?)", [
    texto,
    categoria.insertId,
  ]);
  await conexao.execute("INSERT INTO palavras_do_dia (dia, palavra_id) VALUES (?, ?)", [dia, palavra.insertId]);
}
