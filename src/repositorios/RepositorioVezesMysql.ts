import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { LetraDoJogador } from "../dominio/ChutesDaVez.js";
import { erroLetraRepetida } from "../dominio/PartidaNaSala.js";
import type { NovaVez, OpcaoDePalavra, PalavraEscolhida, RegistroVez } from "../dominio/Vez.js";
import { quandoRepetir, RepositorioMysql } from "./RepositorioMysql.js";
import type { RepositorioVezes } from "./RepositorioVezes.js";

type LinhaVez = RowDataPacket & RegistroVez;
type LinhaLetra = RowDataPacket & LetraDoJogador;
type LinhaOpcao = RowDataPacket & OpcaoDePalavra;
type LinhaPalavra = RowDataPacket & PalavraEscolhida;

const SELECIONAR = `
  SELECT id, numero, rodada, escolhedor_id AS escolhedorId, palavra, dica,
         comeca_em AS comecaEm, escolhida_em AS escolhidaEm, terminou_em AS terminouEm
  FROM vezes`;
const JA_SAIRAM = "SELECT palavra FROM vezes WHERE sala_id = ? AND palavra IS NOT NULL";

export class RepositorioVezesMysql extends RepositorioMysql<LinhaVez, RegistroVez> implements RepositorioVezes {
  async comecarPartida(salaId: number, primeira: NovaVez): Promise<boolean> {
    const [sala] = await this.banco.execute<ResultSetHeader>(
      "UPDATE salas SET situacao = 'jogando' WHERE id = ? AND situacao = 'esperando'",
      [salaId],
    );
    if (sala.affectedRows === 0) {
      return false;
    }
    await this.banco.execute("UPDATE participantes SET pontos = 0 WHERE sala_id = ?", [salaId]);
    await this.criar(salaId, primeira);
    return true;
  }

  async encerrarPartida(salaId: number): Promise<void> {
    await this.banco.execute("UPDATE salas SET situacao = 'encerrada' WHERE id = ? AND situacao = 'jogando'", [salaId]);
  }

  async ultimas(salaId: number, quantas: number): Promise<RegistroVez[]> {
    const [linhas] = await this.banco.execute<LinhaVez[]>(`${SELECIONAR} WHERE sala_id = ? ORDER BY numero DESC LIMIT ?`, [
      salaId,
      quantas,
    ]);
    return linhas.map((linha) => this.converter(linha));
  }

  // Se outro jogador já criou a mesma vez, fica a dele.
  async criar(salaId: number, vez: NovaVez): Promise<void> {
    await this.banco.execute(
      `INSERT INTO vezes (sala_id, numero, rodada, escolhedor_id, comeca_em) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [salaId, vez.numero, vez.rodada, vez.escolhedorId, vez.comecaEm],
    );
  }

  async escolherPalavra(vezId: number, { palavra, dica }: PalavraEscolhida, agora: Date): Promise<boolean> {
    const [resultado] = await this.banco.execute<ResultSetHeader>(
      "UPDATE vezes SET palavra = ?, dica = ?, escolhida_em = ? WHERE id = ? AND palavra IS NULL",
      [palavra, dica, agora, vezId],
    );
    return resultado.affectedRows === 1;
  }

  // Só quem termina a vez soma os pontos, para eles não contarem duas vezes.
  async terminar(vezId: number, terminouEm: Date, pontos: ReadonlyMap<number, number>): Promise<boolean> {
    const [resultado] = await this.banco.execute<ResultSetHeader>(
      "UPDATE vezes SET terminou_em = ? WHERE id = ? AND terminou_em IS NULL",
      [terminouEm, vezId],
    );
    if (resultado.affectedRows === 0) {
      return false;
    }
    for (const [participanteId, ganhos] of pontos) {
      if (ganhos > 0) {
        await this.banco.execute("UPDATE participantes SET pontos = pontos + ? WHERE id = ?", [ganhos, participanteId]);
      }
    }
    return true;
  }

  async letras(vezId: number): Promise<LetraDoJogador[]> {
    const [linhas] = await this.banco.execute<LinhaLetra[]>(
      "SELECT participante_id AS participanteId, letra FROM letras_chutadas WHERE vez_id = ? ORDER BY id",
      [vezId],
    );
    return linhas.map(({ participanteId, letra }) => ({ participanteId, letra }));
  }

  async guardarLetra(vezId: number, { participanteId, letra }: LetraDoJogador): Promise<void> {
    await this.gravar(
      "INSERT INTO letras_chutadas (vez_id, participante_id, letra) VALUES (?, ?, ?)",
      [vezId, participanteId, letra],
      quandoRepetir(() => erroLetraRepetida(letra)),
    );
  }

  // O CRC32 com o id da vez embaralha a lista do mesmo jeito em toda pergunta, até a palavra ser escolhida.
  async opcoesDaLista(salaId: number, listaId: number, vezId: number, quantas: number): Promise<OpcaoDePalavra[]> {
    const [linhas] = await this.banco.execute<LinhaOpcao[]>(
      `SELECT id, texto AS palavra, dica FROM palavras_das_listas
       WHERE lista_id = ? AND texto NOT IN (${JA_SAIRAM})
       ORDER BY CRC32(CONCAT(?, '-', id)), id
       LIMIT ?`,
      [listaId, salaId, vezId, quantas],
    );
    return linhas.map(({ id, palavra, dica }) => ({ id, palavra, dica }));
  }

  async sortearPalavraOficial(salaId: number): Promise<PalavraEscolhida | null> {
    const [linhas] = await this.banco.execute<LinhaPalavra[]>(
      `SELECT p.texto AS palavra, c.nome AS dica
       FROM palavras p
       JOIN categorias c ON c.id = p.categoria_id
       ORDER BY p.texto IN (${JA_SAIRAM}), RAND()
       LIMIT 1`,
      [salaId],
    );
    const linha = linhas[0];
    return linha ? { palavra: linha.palavra, dica: linha.dica } : null;
  }

  protected override converter(linha: LinhaVez): RegistroVez {
    return {
      id: linha.id,
      numero: linha.numero,
      rodada: linha.rodada,
      escolhedorId: linha.escolhedorId,
      palavra: linha.palavra,
      dica: linha.dica,
      comecaEm: linha.comecaEm,
      escolhidaEm: linha.escolhidaEm,
      terminouEm: linha.terminouEm,
    };
  }
}
