import { ErroValidacao } from "../erros/ErroAplicacao.js";

export const TAMANHO_MINIMO_NOME = 3;
export const TAMANHO_MAXIMO_NOME = 100;

export function normalizarNome(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

export function nomeValido(texto: string): boolean {
  const nome = normalizarNome(texto);
  return nome.length >= TAMANHO_MINIMO_NOME && nome.length <= TAMANHO_MAXIMO_NOME && /\p{L}/u.test(nome);
}

export class Nome {
  readonly #texto: string;

  constructor(texto: string) {
    if (!nomeValido(texto)) {
      throw new ErroValidacao("Nome inválido.", {
        nome: `O nome precisa ter de ${TAMANHO_MINIMO_NOME} a ${TAMANHO_MAXIMO_NOME} caracteres.`,
      });
    }
    this.#texto = normalizarNome(texto);
  }

  get texto(): string {
    return this.#texto;
  }
}
