import { ErroValidacao } from "../erros/ErroAplicacao.js";

export const ERROS_PARA_PERDER = 6;

function letraBase(caractere: string): string {
  return caractere.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function recusar(mensagem: string): ErroValidacao {
  return new ErroValidacao(mensagem, { letras: mensagem });
}

// Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Entidade que representa a regra do jogo
export class PartidaDiaria {
  readonly #letras: readonly string[];
  readonly #erros: number;
  readonly #acertou: boolean;

  constructor(palavra: string, letras: readonly string[]) {
    const daPalavra = new Set([...palavra].filter((caractere) => /\p{L}/u.test(caractere)).map(letraBase));
    const faltando = new Set(daPalavra);
    let erros = 0;

    letras.forEach((letra, indice) => {
      if (!/^[A-Z]$/.test(letra)) {
        throw recusar("Envie só letras de A a Z.");
      }
      if (letras.indexOf(letra) !== indice) {
        throw recusar(`A letra ${letra} foi enviada mais de uma vez.`);
      }
      if (faltando.size === 0 || erros >= ERROS_PARA_PERDER) {
        throw recusar("Há letras depois do fim da partida.");
      }
      if (daPalavra.has(letra)) {
        faltando.delete(letra);
      } else {
        erros += 1;
      }
    });

    if (faltando.size > 0 && erros < ERROS_PARA_PERDER) {
      throw recusar("A partida ainda não terminou.");
    }

    this.#letras = [...letras];
    this.#erros = erros;
    this.#acertou = faltando.size === 0;
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
    return this.#acertou;
  }
}
