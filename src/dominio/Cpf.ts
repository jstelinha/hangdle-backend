import { ErroValidacao } from "../erros/ErroAplicacao.js";

const FORMATO_CPF = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

function digitoVerificador(digitos: number[], pesoInicial: number): number {
  const soma = digitos.reduce((total, digito, indice) => total + digito * (pesoInicial - indice), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

// Rubrica de Back-end - Cadastro de Usuário - Validação de CPF
export function cpfValido(texto: string): boolean {
  const limpo = texto.trim();
  if (!FORMATO_CPF.test(limpo)) {
    return false;
  }

  const digitos = [...limpo.replace(/\D/g, "")].map(Number);
  if (digitos.every((digito) => digito === digitos[0])) {
    return false;
  }

  return (
    digitoVerificador(digitos.slice(0, 9), 10) === digitos[9] &&
    digitoVerificador(digitos.slice(0, 10), 11) === digitos[10]
  );
}

// Rubrica de Tech Forge - Encapsulamento e Proteção do Estado - Modificadores de acesso (private, protected, public) ou campos privados nativos (#field)
export class Cpf {
  readonly #digitos: string;

  constructor(texto: string) {
    if (!cpfValido(texto)) {
      throw new ErroValidacao("CPF inválido.", { cpf: "CPF inválido. Confira os 11 números." });
    }
    this.#digitos = texto.replace(/\D/g, "");
  }

  get digitos(): string {
    return this.#digitos;
  }
}
