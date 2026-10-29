import mysql, { type Pool } from "mysql2/promise";
import type { Ambiente } from "../config/ambiente.js";

export function criarConexao(ambiente: Ambiente): Pool {
  return mysql.createPool({
    host: ambiente.DB_HOST,
    port: ambiente.DB_PORT,
    user: ambiente.DB_USER,
    password: ambiente.DB_PASSWORD,
    database: ambiente.DB_NAME,
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
  });
}
