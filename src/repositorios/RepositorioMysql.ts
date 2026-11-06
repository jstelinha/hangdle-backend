import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { ExecutorSql } from "../banco/conexao.js";
import { deslocamento, montarPagina, type Pagina, type PedidoDePagina } from "../dominio/Pagina.js";
import type { ErroConflito } from "../erros/ErroAplicacao.js";

export type ValorSql = string | number | null;

type LinhaTotal = RowDataPacket & { total: number };

function ehEntradaDuplicada(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && "code" in erro && erro.code === "ER_DUP_ENTRY";
}

// Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Classe abstrata com o que os repositórios dos CRUDs repetiriam
export abstract class RepositorioMysql<Linha extends RowDataPacket, Recurso> {
  protected readonly banco: ExecutorSql;

  constructor(banco: ExecutorSql) {
    this.banco = banco;
  }

  protected abstract converter(linha: Linha): Recurso;

  protected async buscarUm(sql: string, valores: ValorSql[]): Promise<Recurso | null> {
    const [linhas] = await this.banco.execute<Linha[]>(sql, valores);
    const linha = linhas[0];
    return linha ? this.converter(linha) : null;
  }

  // Rubrica de Back-end - Cruds Completos - Paginação das listagens
  protected async listarPagina(
    sqlDosItens: string,
    sqlDoTotal: string,
    valores: ValorSql[],
    pedido: PedidoDePagina,
  ): Promise<Pagina<Recurso>> {
    const [linhas] = await this.banco.execute<Linha[]>(`${sqlDosItens} LIMIT ? OFFSET ?`, [
      ...valores,
      pedido.porPagina,
      deslocamento(pedido),
    ]);
    const [contagem] = await this.banco.execute<LinhaTotal[]>(sqlDoTotal, valores);
    return montarPagina(
      linhas.map((linha) => this.converter(linha)),
      Number(contagem[0]?.total ?? 0),
      pedido,
    );
  }

  protected async gravar(sql: string, valores: ValorSql[], seRepetir: () => ErroConflito): Promise<ResultSetHeader> {
    try {
      const [resultado] = await this.banco.execute<ResultSetHeader>(sql, valores);
      return resultado;
    } catch (erro) {
      throw ehEntradaDuplicada(erro) ? seRepetir() : erro;
    }
  }
}
