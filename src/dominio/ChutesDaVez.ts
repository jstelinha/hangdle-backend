import { ErroProibido } from "../erros/ErroAplicacao.js";
import { PartidaNaSala, PONTOS } from "./PartidaNaSala.js";

export type LetraDoJogador = { participanteId: number; letra: string };

// Rubrica de Tech Forge - Encapsulamento e Proteção do Estado - As forcas de todos numa vez só mudam por chutar, que também guarda quem acertou primeiro
export class ChutesDaVez {
  readonly #partidas: ReadonlyMap<number, PartidaNaSala>;
  readonly #ordemDeAcerto: number[] = [];

  // As letras chegam na ordem em que foram chutadas; as de quem já saiu da sala ficam de fora.
  constructor(palavra: string, adivinhadores: readonly number[], letras: readonly LetraDoJogador[]) {
    this.#partidas = new Map(adivinhadores.map((participanteId) => [participanteId, new PartidaNaSala(palavra)]));
    for (const { participanteId, letra } of letras) {
      if (this.#partidas.get(participanteId)?.terminou === false) {
        this.chutar(participanteId, letra);
      }
    }
  }

  chutar(participanteId: number, letra: string): boolean {
    const partida = this.#partidas.get(participanteId);
    if (!partida) {
      throw new ErroProibido("Você não está adivinhando nesta vez.");
    }
    const estaNaPalavra = partida.chutar(letra);
    if (partida.acertou) {
      this.#ordemDeAcerto.push(participanteId);
    }
    return estaNaPalavra;
  }

  partidaDe(participanteId: number): PartidaNaSala | null {
    return this.#partidas.get(participanteId) ?? null;
  }

  get todosTerminaram(): boolean {
    return [...this.#partidas.values()].every((partida) => partida.terminou);
  }

  pontosDe(participanteId: number): number {
    return this.#partidas.get(participanteId)?.pontos(this.#ordemDeAcerto[0] === participanteId) ?? 0;
  }

  pontosDeQuemEscolheu(): number {
    return this.#ordemDeAcerto.length * PONTOS.deQuemEscolheuPorAcerto;
  }

  // Os pontos que cada um ganha nesta vez, inclusive quem escolheu a palavra.
  pontos(escolhedorId: number): Map<number, number> {
    const pontos = new Map([...this.#partidas.keys()].map((participanteId) => [participanteId, this.pontosDe(participanteId)]));
    pontos.set(escolhedorId, this.pontosDeQuemEscolheu());
    return pontos;
  }
}
