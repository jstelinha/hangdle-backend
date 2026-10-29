import { ErroValidacao } from "../erros/ErroAplicacao.js";

export const TAMANHO_MAXIMO_EMAIL = 254;

// Rubrica de Back-end - Autenticação - Validação de e-mail (regex)
export const REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function normalizarEmail(texto: string): string {
  return texto.trim().toLowerCase();
}

// Rubrica de Back-end - Cadastro de Usuário - Validação de email
export function emailValido(texto: string): boolean {
  const email = normalizarEmail(texto);
  return email.length <= TAMANHO_MAXIMO_EMAIL && REGEX_EMAIL.test(email);
}

export class Email {
  readonly #endereco: string;

  constructor(texto: string) {
    if (!emailValido(texto)) {
      throw new ErroValidacao("E-mail inválido.", { email: "Digite um e-mail válido, como nome@exemplo.com." });
    }
    this.#endereco = normalizarEmail(texto);
  }

  // Rubrica de Tech Forge - Acesso Controlado e Propriedades - get / set apenas onde existe validação, transformação ou regra de negócio
  get endereco(): string {
    return this.#endereco;
  }
}
