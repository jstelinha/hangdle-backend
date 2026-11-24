import type { RowDataPacket } from "mysql2/promise";
import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import type { EdicaoParticipante, NovoParticipante, Participante } from "../dominio/Participante.js";
import { RepositorioMysql, type TradutorDeFalha } from "./RepositorioMysql.js";
import {
  erroApelidoRepetido,
  erroJaEstaNaSala,
  erroSalaCheia,
  type RepositorioParticipantes,
} from "./RepositorioParticipantes.js";

type LinhaParticipante = RowDataPacket & Omit<Participante, "dono"> & { dono: number };

const SELECIONAR = `
  SELECT p.id, p.sala_id AS salaId, p.usuario_id AS usuarioId, p.apelido, p.pontos, p.usuario_id = s.dono_id AS dono
  FROM participantes p
  JOIN salas s ON s.id = p.sala_id`;

const RECUSAS: TradutorDeFalha = (falha) => {
  if (falha.chaveRepetida?.includes("uq_participantes_sala_apelido")) {
    return erroApelidoRepetido();
  }
  if (falha.chaveRepetida?.includes("uq_participantes_sala_usuario")) {
    return erroJaEstaNaSala();
  }
  return falha.sinal === "Sala cheia" ? erroSalaCheia() : null;
};

export class RepositorioParticipantesMysql
  extends RepositorioMysql<LinhaParticipante, Participante>
  implements RepositorioParticipantes
{
  listar(salaId: number, pedido: PedidoDePagina): Promise<Pagina<Participante>> {
    return this.listarPagina(
      `${SELECIONAR} WHERE p.sala_id = ? ORDER BY p.entrou_em, p.id`,
      "SELECT COUNT(*) AS total FROM participantes WHERE sala_id = ?",
      [salaId],
      pedido,
    );
  }

  buscar(id: number): Promise<Participante | null> {
    return this.buscarUm(`${SELECIONAR} WHERE p.id = ?`, [id]);
  }

  buscarNaSala(salaId: number, usuarioId: number): Promise<Participante | null> {
    return this.buscarUm(`${SELECIONAR} WHERE p.sala_id = ? AND p.usuario_id = ?`, [salaId, usuarioId]);
  }

  async criar(salaId: number, { usuarioId, apelido }: NovoParticipante): Promise<Participante> {
    const { insertId } = await this.gravar(
      "INSERT INTO participantes (sala_id, usuario_id, apelido) VALUES (?, ?, ?)",
      [salaId, usuarioId, apelido],
      RECUSAS,
    );
    const criado = await this.buscar(insertId);
    if (!criado) {
      throw new Error("O participante sumiu logo depois de entrar.");
    }
    return criado;
  }

  async atualizar(id: number, { apelido }: EdicaoParticipante): Promise<void> {
    await this.gravar("UPDATE participantes SET apelido = ? WHERE id = ?", [apelido, id], RECUSAS);
  }

  async apagar(id: number): Promise<void> {
    await this.banco.execute("DELETE FROM participantes WHERE id = ?", [id]);
  }

  protected override converter(linha: LinhaParticipante): Participante {
    return {
      id: linha.id,
      salaId: linha.salaId,
      usuarioId: linha.usuarioId,
      apelido: linha.apelido,
      pontos: linha.pontos,
      dono: Boolean(linha.dono),
    };
  }
}
