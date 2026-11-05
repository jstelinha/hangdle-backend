import type { RowDataPacket } from "mysql2/promise";
import type { ExecutorSql } from "../banco/conexao.js";
import type { ContagemDoDia } from "../dominio/EstatisticasDoDia.js";
import type { ResultadoDiario } from "../dominio/ResultadoDiario.js";
import { erroJaJogou, type RepositorioResultados } from "./RepositorioResultados.js";

type LinhaResultado = RowDataPacket & Omit<ResultadoDiario, "letras" | "acertou"> & { letras: string; acertou: number };
type LinhaContagem = RowDataPacket & { acertou: number; chutes: number; jogadores: number };

const CONTAR_DO_DIA = `
  SELECT acertou, chutes, COUNT(*) AS jogadores
  FROM resultados_diarios
  WHERE dia = ?
  GROUP BY acertou, chutes`;

const LISTAR = `
  SELECT DATE_FORMAT(r.dia, '%Y-%m-%d') AS dia, p.texto AS palavra, c.nome AS categoria,
         r.letras, r.chutes, r.erros, r.acertou
  FROM resultados_diarios r
  JOIN palavras_do_dia pd ON pd.dia = r.dia
  JOIN palavras p ON p.id = pd.palavra_id
  JOIN categorias c ON c.id = p.categoria_id
  WHERE r.usuario_id = ? AND (? IS NULL OR r.dia = ?)
  ORDER BY r.dia DESC`;

function ehEntradaDuplicada(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && "code" in erro && erro.code === "ER_DUP_ENTRY";
}

export class RepositorioResultadosMysql implements RepositorioResultados {
  readonly #banco: ExecutorSql;

  constructor(banco: ExecutorSql) {
    this.#banco = banco;
  }

  async salvar(usuarioId: number, resultado: ResultadoDiario): Promise<void> {
    try {
      await this.#banco.execute(
        "INSERT INTO resultados_diarios (usuario_id, dia, letras, erros, acertou) VALUES (?, ?, ?, ?, ?)",
        [usuarioId, resultado.dia, resultado.letras.join(""), resultado.erros, resultado.acertou],
      );
    } catch (erro) {
      throw ehEntradaDuplicada(erro) ? erroJaJogou() : erro;
    }
  }

  async listar(usuarioId: number, dia?: string): Promise<ResultadoDiario[]> {
    const [linhas] = await this.#banco.execute<LinhaResultado[]>(LISTAR, [usuarioId, dia ?? null, dia ?? null]);
    return linhas.map((linha) => ({
      dia: linha.dia,
      palavra: linha.palavra,
      categoria: linha.categoria,
      letras: [...linha.letras],
      chutes: linha.chutes,
      erros: linha.erros,
      acertou: Boolean(linha.acertou),
    }));
  }

  async contarDoDia(dia: string): Promise<ContagemDoDia[]> {
    const [linhas] = await this.#banco.execute<LinhaContagem[]>(CONTAR_DO_DIA, [dia]);
    return linhas.map((linha) => ({
      acertou: Boolean(linha.acertou),
      chutes: linha.chutes,
      jogadores: Number(linha.jogadores),
    }));
  }
}
