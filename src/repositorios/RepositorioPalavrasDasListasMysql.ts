import type { RowDataPacket } from "mysql2/promise";
import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import type { PalavraDaLista } from "../dominio/PalavraDaLista.js";
import type { DadosPalavra } from "../esquemas/palavraDaLista.js";
import { quandoRepetir, RepositorioMysql } from "./RepositorioMysql.js";
import { erroPalavraRepetida, type RepositorioPalavrasDasListas } from "./RepositorioPalavrasDasListas.js";

type LinhaPalavra = RowDataPacket & PalavraDaLista;

const SELECIONAR = "SELECT id, lista_id AS listaId, texto AS palavra, dica FROM palavras_das_listas";

export class RepositorioPalavrasDasListasMysql
  extends RepositorioMysql<LinhaPalavra, PalavraDaLista>
  implements RepositorioPalavrasDasListas
{
  listar(listaId: number, pedido: PedidoDePagina): Promise<Pagina<PalavraDaLista>> {
    return this.listarPagina(
      `${SELECIONAR} WHERE lista_id = ? ORDER BY texto, id`,
      "SELECT COUNT(*) AS total FROM palavras_das_listas WHERE lista_id = ?",
      [listaId],
      pedido,
    );
  }

  buscar(id: number): Promise<PalavraDaLista | null> {
    return this.buscarUm(`${SELECIONAR} WHERE id = ?`, [id]);
  }

  async criar(listaId: number, { palavra, dica }: DadosPalavra): Promise<PalavraDaLista> {
    const { insertId } = await this.gravar(
      "INSERT INTO palavras_das_listas (lista_id, texto, dica) VALUES (?, ?, ?)",
      [listaId, palavra, dica],
      quandoRepetir(erroPalavraRepetida),
    );
    return { id: insertId, listaId, palavra, dica };
  }

  async atualizar(id: number, { palavra, dica }: DadosPalavra): Promise<void> {
    await this.gravar(
      "UPDATE palavras_das_listas SET texto = ?, dica = ? WHERE id = ?",
      [palavra, dica, id],
      quandoRepetir(erroPalavraRepetida),
    );
  }

  async apagar(id: number): Promise<void> {
    await this.banco.execute("DELETE FROM palavras_das_listas WHERE id = ?", [id]);
  }

  protected override converter(linha: LinhaPalavra): PalavraDaLista {
    return { id: linha.id, listaId: linha.listaId, palavra: linha.palavra, dica: linha.dica };
  }
}
