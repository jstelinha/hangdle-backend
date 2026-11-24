import type { RowDataPacket } from "mysql2/promise";
import type { ExecutorSql } from "../banco/conexao.js";
import type { PalavraDoDia } from "../dominio/PalavraDoDia.js";
import type { RepositorioPalavrasDoDia } from "./RepositorioPalavrasDoDia.js";

type LinhaPalavraDoDia = RowDataPacket & PalavraDoDia;

const SORTEAR_SEM_REPETIR = `
  INSERT INTO palavras_do_dia (dia, palavra_id)
  SELECT ?, p.id
  FROM palavras p
  LEFT JOIN (
    SELECT palavra_id, MAX(dia) AS ultima_vez FROM palavras_do_dia GROUP BY palavra_id
  ) usadas ON usadas.palavra_id = p.id
  ORDER BY usadas.ultima_vez IS NOT NULL, usadas.ultima_vez, RAND()
  LIMIT 1
  ON DUPLICATE KEY UPDATE palavra_id = palavras_do_dia.palavra_id`;

const BUSCAR = `
  SELECT DATE_FORMAT(pd.dia, '%Y-%m-%d') AS dia, p.texto AS palavra, c.nome AS categoria
  FROM palavras_do_dia pd
  JOIN palavras p ON p.id = pd.palavra_id
  JOIN categorias c ON c.id = p.categoria_id
  WHERE pd.dia = ?`;

export class RepositorioPalavrasDoDiaMysql implements RepositorioPalavrasDoDia {
  readonly #banco: ExecutorSql;

  constructor(banco: ExecutorSql) {
    this.#banco = banco;
  }

  async buscar(dia: string): Promise<PalavraDoDia | null> {
    const [linhas] = await this.#banco.execute<LinhaPalavraDoDia[]>(BUSCAR, [dia]);
    const linha = linhas[0];
    return linha ? { dia: linha.dia, palavra: linha.palavra, categoria: linha.categoria } : null;
  }

  async sortear(dia: string): Promise<PalavraDoDia | null> {
    await this.#banco.execute(SORTEAR_SEM_REPETIR, [dia]);
    return this.buscar(dia);
  }
}
