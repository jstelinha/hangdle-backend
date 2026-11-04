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
