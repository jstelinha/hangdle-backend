import type { PalavraDoDia } from "../../src/dominio/PalavraDoDia.js";
import type { RepositorioPalavrasDoDia } from "../../src/repositorios/RepositorioPalavrasDoDia.js";

export type PalavraCadastrada = Omit<PalavraDoDia, "dia">;

export class RepositorioPalavrasDoDiaMemoria implements RepositorioPalavrasDoDia {
  readonly #cadastradas: PalavraCadastrada[];
  readonly #sorteadas = new Map<string, PalavraCadastrada>();

  constructor(cadastradas: PalavraCadastrada[]) {
    this.#cadastradas = cadastradas;
  }

  async buscar(dia: string): Promise<PalavraDoDia | null> {
    const sorteada = this.#sorteadas.get(dia);
    return sorteada ? { dia, ...sorteada } : null;
  }

  async sortear(dia: string): Promise<PalavraDoDia | null> {
    const proxima = [...this.#cadastradas].sort((a, b) => this.#ultimaVez(a).localeCompare(this.#ultimaVez(b)))[0];
    if (!this.#sorteadas.has(dia) && proxima) {
      this.#sorteadas.set(dia, proxima);
    }
    return this.buscar(dia);
  }

  #ultimaVez(palavra: PalavraCadastrada): string {
    const dias = [...this.#sorteadas].filter(([, sorteada]) => sorteada === palavra).map(([dia]) => dia);
    return dias.sort().at(-1) ?? "";
  }
}
