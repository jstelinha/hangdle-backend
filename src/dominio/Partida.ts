import type { ErroAplicacao } from "../erros/ErroAplicacao.js";

export const ERROS_PARA_PERDER = 6;

// Rubrica de Tech Forge - Tipagem Avançada e Recursos do TypeScript - União discriminada com os motivos para recusar uma letra
export type LetraRecusada = { motivo: "invalida" } | { motivo: "repetida"; letra: string } | { motivo: "depoisDoFim" };

function ehLetra(caractere: string): boolean {
  return /\p{L}/u.test(caractere);
}

function letraBase(caractere: string): string {
  return caractere.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

// Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Classe abstrata com a regra da forca, comum à partida diária e à partida na sala
// Rubrica de Tech Forge - Aderência aos Princípios SOLID - Substituição de Liskov: a partida diária e a da sala só acrescentam, e mantêm chutarLetra, erros, acertou e casas como aqui
export abstract class Partida {
  readonly #palavra: string;
  readonly #daPalavra: ReadonlySet<string>;
  readonly #letras: string[] = [];
  #erros = 0;

  protected constructor(palavra: string) {
    this.#palavra = palavra;
    this.#daPalavra = new Set([...palavra].filter(ehLetra).map(letraBase));
  }

  // Cada partida diz com que erro e que mensagem recusa a letra.
  protected abstract recusar(recusa: LetraRecusada): ErroAplicacao;

  protected chutarLetra(letra: string): boolean {
    if (!/^[A-Z]$/.test(letra)) {
      throw this.recusar({ motivo: "invalida" });
    }
    if (this.#letras.includes(letra)) {
      throw this.recusar({ motivo: "repetida", letra });
    }
    if (this.terminou) {
      throw this.recusar({ motivo: "depoisDoFim" });
    }
    this.#letras.push(letra);
    const estaNaPalavra = this.#daPalavra.has(letra);
    if (!estaNaPalavra) {
      this.#erros += 1;
    }
    return estaNaPalavra;
  }

  get letras(): string[] {
    return [...this.#letras];
  }

  get chutes(): number {
    return this.#letras.length;
  }

  get erros(): number {
    return this.#erros;
  }

  get acertou(): boolean {
    return [...this.#daPalavra].every((letra) => this.#letras.includes(letra));
  }

  get terminou(): boolean {
    return this.acertou || this.#erros >= ERROS_PARA_PERDER;
  }

  // Cada caractere da palavra: a letra, se já foi chutada; null, se ainda está escondida. Espaço e hífen aparecem sempre.
  get casas(): (string | null)[] {
    return [...this.#palavra].map((caractere) =>
      !ehLetra(caractere) || this.#letras.includes(letraBase(caractere)) ? caractere : null,
    );
  }
}
