import { ErroConflito, ErroValidacao, type ErroAplicacao } from "../erros/ErroAplicacao.js";
import type { JogadasDoDia } from "../esquemas/palavraDoDia.js";
import type { PalavraDoDia } from "./PalavraDoDia.js";
import { Partida, type LetraRecusada } from "./Partida.js";
import { erroLetraRepetida } from "./PartidaNaSala.js";

// O que quem joga vê da palavra do dia: as casas abertas, as letras e os erros. A palavra só vem quando a partida acaba.
export type JogoDoDia = {
  dia: string;
  categoria: string;
  casas: (string | null)[];
  letras: string[];
  erros: number;
  acertou: boolean;
  terminou: boolean;
  palavra: string | null;
  token: string;
};

// A palavra do dia jogada letra por letra, com a palavra só na API. As letras de antes chegam assinadas no token.
export class ForcaDoDia extends Partida {
  readonly #palavraDoDia: PalavraDoDia;

  constructor(palavraDoDia: PalavraDoDia, letras: readonly string[]) {
    super(palavraDoDia.palavra);
    this.#palavraDoDia = palavraDoDia;
    letras.forEach((letra) => this.chutarLetra(letra));
  }

  chutar(letra: string): void {
    this.chutarLetra(letra);
  }

  // O que vai assinado no próximo token.
  get jogadas(): JogadasDoDia {
    return { dia: this.#palavraDoDia.dia, letras: this.letras };
  }

  paraQuemJoga(token: string): JogoDoDia {
    const { dia, categoria, palavra } = this.#palavraDoDia;
    return {
      dia,
      categoria,
      casas: this.casas,
      letras: this.letras,
      erros: this.erros,
      acertou: this.acertou,
      terminou: this.terminou,
      palavra: this.terminou ? palavra : null,
      token,
    };
  }

  protected override recusar(recusa: LetraRecusada): ErroAplicacao {
    switch (recusa.motivo) {
      case "invalida":
        return new ErroValidacao("Envie uma letra de A a Z.", { letra: "Envie uma letra de A a Z." });
      case "repetida":
        return erroLetraRepetida(recusa.letra);
      case "depoisDoFim":
        return new ErroConflito("Esta partida já terminou.");
    }
  }
}
