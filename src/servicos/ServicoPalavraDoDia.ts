import { diaNoFuso } from "../dominio/dia.js";
import type { PalavraDoDia } from "../dominio/PalavraDoDia.js";
import { ErroIndisponivel } from "../erros/ErroAplicacao.js";
import type { RepositorioPalavrasDoDia } from "../repositorios/RepositorioPalavrasDoDia.js";

export class ServicoPalavraDoDia {
  readonly #palavras: RepositorioPalavrasDoDia;
  readonly #agora: () => Date;

  constructor(palavras: RepositorioPalavrasDoDia, agora: () => Date) {
    this.#palavras = palavras;
    this.#agora = agora;
  }

  async deHoje(): Promise<PalavraDoDia> {
    const dia = diaNoFuso(this.#agora());
    const palavra = (await this.#palavras.buscar(dia)) ?? (await this.#palavras.sortear(dia));
    if (!palavra) {
      throw new ErroIndisponivel("Ainda não há palavras cadastradas para o jogo.");
    }
    return palavra;
  }
}
