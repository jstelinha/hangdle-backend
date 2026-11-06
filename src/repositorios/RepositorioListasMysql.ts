import type { RowDataPacket } from "mysql2/promise";
import type { Lista } from "../dominio/Lista.js";
import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import type { DadosLista } from "../esquemas/lista.js";
import { erroListaRepetida, type RepositorioListas } from "./RepositorioListas.js";
import { quandoRepetir, RepositorioMysql } from "./RepositorioMysql.js";

type LinhaLista = RowDataPacket & {
  id: number;
  usuarioId: number;
  nome: string;
  totalDePalavras: number | string;
};

const SELECIONAR = `
  SELECT l.id, l.usuario_id AS usuarioId, l.nome,
         (SELECT COUNT(*) FROM palavras_das_listas p WHERE p.lista_id = l.id) AS totalDePalavras
  FROM listas l`;

export class RepositorioListasMysql extends RepositorioMysql<LinhaLista, Lista> implements RepositorioListas {
  listar(usuarioId: number, pedido: PedidoDePagina): Promise<Pagina<Lista>> {
    return this.listarPagina(
      `${SELECIONAR} WHERE l.usuario_id = ? ORDER BY l.nome, l.id`,
      "SELECT COUNT(*) AS total FROM listas WHERE usuario_id = ?",
      [usuarioId],
      pedido,
    );
  }

  buscar(id: number): Promise<Lista | null> {
    return this.buscarUm(`${SELECIONAR} WHERE l.id = ?`, [id]);
  }

  async criar(usuarioId: number, { nome }: DadosLista): Promise<Lista> {
    const { insertId } = await this.gravar(
      "INSERT INTO listas (usuario_id, nome) VALUES (?, ?)",
      [usuarioId, nome],
      quandoRepetir(erroListaRepetida),
    );
    return { id: insertId, usuarioId, nome, totalDePalavras: 0 };
  }

  async atualizar(id: number, { nome }: DadosLista): Promise<void> {
    await this.gravar("UPDATE listas SET nome = ? WHERE id = ?", [nome, id], quandoRepetir(erroListaRepetida));
  }

  async apagar(id: number): Promise<void> {
    await this.banco.execute("DELETE FROM listas WHERE id = ?", [id]);
  }

  protected override converter(linha: LinhaLista): Lista {
    return { id: linha.id, usuarioId: linha.usuarioId, nome: linha.nome, totalDePalavras: Number(linha.totalDePalavras) };
  }
}
