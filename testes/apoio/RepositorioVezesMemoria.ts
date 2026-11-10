import type { LetraDoJogador } from "../../src/dominio/ChutesDaVez.js";
import { erroLetraRepetida } from "../../src/dominio/PartidaNaSala.js";
import type { NovaVez, OpcaoDePalavra, PalavraEscolhida, RegistroVez } from "../../src/dominio/Vez.js";
import type { RepositorioVezes } from "../../src/repositorios/RepositorioVezes.js";
import { mesmoTexto } from "./paginarEmMemoria.js";
import type { RepositorioPalavrasDasListasMemoria } from "./RepositorioPalavrasDasListasMemoria.js";
import type { PalavraCadastrada } from "./RepositorioPalavrasDoDiaMemoria.js";
import type { RepositorioParticipantesMemoria } from "./RepositorioParticipantesMemoria.js";
import type { RepositorioSalasMemoria } from "./RepositorioSalasMemoria.js";

type Registro = RegistroVez & { salaId: number };
type LetraGuardada = LetraDoJogador & { vezId: number };

// Imita o CRC32 do MySQL: a mesma vez embaralha a lista sempre do mesmo jeito.
function embaralhar(vezId: number, palavraId: number): number {
  return (Math.imul(vezId, 2654435761) ^ Math.imul(palavraId, 40503)) >>> 0;
}

export class RepositorioVezesMemoria implements RepositorioVezes {
  readonly #vezes: Registro[] = [];
  readonly #letras: LetraGuardada[] = [];
  readonly #salas: RepositorioSalasMemoria;
  readonly #participantes: RepositorioParticipantesMemoria;
  readonly #palavrasDasListas: RepositorioPalavrasDasListasMemoria;
  readonly #oficiais: readonly PalavraCadastrada[];
  #proximoId = 1;

  constructor(
    salas: RepositorioSalasMemoria,
    participantes: RepositorioParticipantesMemoria,
    palavrasDasListas: RepositorioPalavrasDasListasMemoria,
    oficiais: readonly PalavraCadastrada[],
  ) {
    this.#salas = salas;
    this.#participantes = participantes;
    this.#palavrasDasListas = palavrasDasListas;
    this.#oficiais = oficiais;
  }

  async comecarPartida(salaId: number, primeira: NovaVez): Promise<boolean> {
    if ((await this.#salas.buscar(salaId))?.situacao !== "esperando") {
      return false;
    }
    this.#salas.mudarSituacao(salaId, "jogando");
    this.#participantes.zerarPontos(salaId);
    await this.criar(salaId, primeira);
    return true;
  }

  async encerrarPartida(salaId: number): Promise<void> {
    if ((await this.#salas.buscar(salaId))?.situacao === "jogando") {
      this.#salas.mudarSituacao(salaId, "encerrada");
    }
  }

  async ultimas(salaId: number, quantas: number): Promise<RegistroVez[]> {
    return this.#daSala(salaId)
      .sort((a, b) => b.numero - a.numero)
      .slice(0, quantas)
      .map(({ salaId: _sala, ...vez }) => ({ ...vez }));
  }

  async criar(salaId: number, vez: NovaVez): Promise<void> {
    if (!this.#daSala(salaId).some((existente) => existente.numero === vez.numero)) {
      this.#vezes.push({ ...vez, id: this.#proximoId++, salaId, palavra: null, dica: null, escolhidaEm: null, terminouEm: null });
    }
  }

  async escolherPalavra(vezId: number, { palavra, dica }: PalavraEscolhida, agora: Date): Promise<boolean> {
    const vez = this.#vezes.find(({ id }) => id === vezId);
    if (!vez || vez.palavra !== null) {
      return false;
    }
    Object.assign(vez, { palavra, dica, escolhidaEm: agora });
    return true;
  }

  async terminar(vezId: number, terminouEm: Date, pontos: ReadonlyMap<number, number>): Promise<boolean> {
    const vez = this.#vezes.find(({ id }) => id === vezId);
    if (!vez || vez.terminouEm) {
      return false;
    }
    vez.terminouEm = terminouEm;
    for (const [participanteId, ganhos] of pontos) {
      this.#participantes.somarPontos(participanteId, ganhos);
    }
    return true;
  }

  async letras(vezId: number): Promise<LetraDoJogador[]> {
    return this.#letras
      .filter((guardada) => guardada.vezId === vezId && this.#participantes.existe(guardada.participanteId))
      .map(({ participanteId, letra }) => ({ participanteId, letra }));
  }

  async guardarLetra(vezId: number, chute: LetraDoJogador): Promise<void> {
    if (this.#letras.some((guardada) => guardada.vezId === vezId && guardada.participanteId === chute.participanteId && guardada.letra === chute.letra)) {
      throw erroLetraRepetida(chute.letra);
    }
    this.#letras.push({ ...chute, vezId });
  }

  async opcoesDaLista(salaId: number, listaId: number, vezId: number, quantas: number): Promise<OpcaoDePalavra[]> {
    const jaSairam = this.#jaSairam(salaId);
    return this.#palavrasDasListas
      .todasDaLista(listaId)
      .filter(({ palavra }) => !jaSairam.some((saiu) => mesmoTexto(saiu, palavra)))
      .sort((a, b) => embaralhar(vezId, a.id) - embaralhar(vezId, b.id) || a.id - b.id)
      .slice(0, quantas)
      .map(({ id, palavra, dica }) => ({ id, palavra, dica }));
  }

  async sortearPalavraOficial(salaId: number): Promise<PalavraEscolhida | null> {
    const jaSairam = this.#jaSairam(salaId);
    const escolhida = this.#oficiais.find(({ palavra }) => !jaSairam.some((saiu) => mesmoTexto(saiu, palavra))) ?? this.#oficiais[0];
    return escolhida ? { palavra: escolhida.palavra, dica: escolhida.categoria } : null;
  }

  // Como o ON DELETE CASCADE: a vez de quem saiu da sala (ou da sala apagada) some.
  #daSala(salaId: number): Registro[] {
    return this.#vezes.filter((vez) => vez.salaId === salaId && this.#participantes.existe(vez.escolhedorId));
  }

  #jaSairam(salaId: number): string[] {
    return this.#daSala(salaId).flatMap(({ palavra }) => (palavra ? [palavra] : []));
  }
}
