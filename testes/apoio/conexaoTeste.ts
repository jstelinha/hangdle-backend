import mysql, { type Connection } from "mysql2/promise";

export function conectarBancoDeTeste(): Promise<Connection> {
  return mysql.createConnection({
    host: process.env.TESTE_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  });
}

const TABELAS_DO_JOGO = ["palavras_das_listas", "listas", "resultados_diarios", "palavras_do_dia", "palavras", "categorias"];

export async function esvaziarTabelasDoJogo(conexao: Connection): Promise<void> {
  for (const tabela of TABELAS_DO_JOGO) {
    await conexao.query(`DELETE FROM ${tabela}`);
  }
}
