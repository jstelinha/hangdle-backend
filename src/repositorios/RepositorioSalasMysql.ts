import type { RowDataPacket } from "mysql2/promise";
import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import type { RegistroSala, Sala } from "../dominio/Sala.js";
import { SenhaDaSala } from "../dominio/SenhaDaSala.js";
import { ErroConflito } from "../erros/ErroAplicacao.js";
import { RepositorioMysql, type TradutorDeFalha } from "./RepositorioMysql.js";
import type { RepositorioSalas } from "./RepositorioSalas.js";

type LinhaSala = RowDataPacket & Omit<Sala, "privada" | "jogadores"> & { privada: number; jogadores: number | string };
type LinhaSenha = RowDataPacket & { senha_hash: string | null };

const SELECIONAR = `
  SELECT s.id, s.dono_id AS donoId, s.nome, s.senha_hash IS NOT NULL AS privada, s.lista_id AS listaId,
         s.segundos_por_rodada AS segundosPorRodada, s.rodadas, s.maximo_de_jogadores AS maximoDeJogadores,
         s.situacao, (SELECT COUNT(*) FROM participantes p WHERE p.sala_id = s.id) AS jogadores
  FROM salas s`;
const DA_PESSOA = "EXISTS (SELECT 1 FROM participantes p WHERE p.sala_id = s.id AND p.usuario_id = ?)";
const ABERTAS = "s.senha_hash IS NULL AND s.situacao <> 'encerrada'";
const ORDEM = "ORDER BY s.criada_em DESC, s.id DESC";

const MAXIMO_ABAIXO: TradutorDeFalha = (falha) =>
  falha.sinal?.includes("mais jogadores") ? new ErroConflito("Já há mais jogadores na sala do que esse máximo.") : null;

function valores(registro: RegistroSala) {
  return [
    registro.nome,
    registro.senhaHash,
    registro.listaId,
    registro.segundosPorRodada,
    registro.rodadas,
    registro.maximoDeJogadores,
  ];
}

export class RepositorioSalasMysql extends RepositorioMysql<LinhaSala, Sala> implements RepositorioSalas {
  listar(usuarioId: number, pedido: PedidoDePagina): Promise<Pagina<Sala>> {
    return this.listarPagina(
      `${SELECIONAR} WHERE ${DA_PESSOA} ${ORDEM}`,
      `SELECT COUNT(*) AS total FROM salas s WHERE ${DA_PESSOA}`,
      [usuarioId],
      pedido,
    );
  }

  listarAbertas(pedido: PedidoDePagina): Promise<Pagina<Sala>> {
    return this.listarPagina(`${SELECIONAR} WHERE ${ABERTAS} ${ORDEM}`, `SELECT COUNT(*) AS total FROM salas s WHERE ${ABERTAS}`, [], pedido);
  }

  buscar(id: number): Promise<Sala | null> {
    return this.buscarUm(`${SELECIONAR} WHERE s.id = ?`, [id]);
  }

  async buscarSenha(id: number): Promise<SenhaDaSala | null> {
    const [linhas] = await this.banco.execute<LinhaSenha[]>("SELECT senha_hash FROM salas WHERE id = ?", [id]);
    const hash = linhas[0]?.senha_hash;
    return hash ? SenhaDaSala.aPartirDoHash(hash) : null;
  }

  async criar(donoId: number, registro: RegistroSala): Promise<Sala> {
    const { insertId } = await this.gravar(
      `INSERT INTO salas (nome, senha_hash, lista_id, segundos_por_rodada, rodadas, maximo_de_jogadores, dono_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [...valores(registro), donoId],
      () => null,
    );
    const { senhaHash, ...configuracao } = registro;
    return { id: insertId, donoId, ...configuracao, privada: senhaHash !== null, jogadores: 0, situacao: "esperando" };
  }

  async atualizar(id: number, registro: RegistroSala): Promise<void> {
    await this.gravar(
      `UPDATE salas SET nome = ?, senha_hash = ?, lista_id = ?, segundos_por_rodada = ?, rodadas = ?, maximo_de_jogadores = ?
       WHERE id = ?`,
      [...valores(registro), id],
      MAXIMO_ABAIXO,
    );
  }

  async apagar(id: number): Promise<void> {
    await this.banco.execute("DELETE FROM salas WHERE id = ?", [id]);
  }

  protected override converter(linha: LinhaSala): Sala {
    return {
      id: linha.id,
      donoId: linha.donoId,
      nome: linha.nome,
      privada: Boolean(linha.privada),
      listaId: linha.listaId,
      segundosPorRodada: linha.segundosPorRodada,
      rodadas: linha.rodadas,
      maximoDeJogadores: linha.maximoDeJogadores,
      jogadores: Number(linha.jogadores),
      situacao: linha.situacao,
    };
  }
}
