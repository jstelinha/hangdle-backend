import bcrypt from "bcryptjs";
import { ErroValidacao } from "../erros/ErroAplicacao.js";

export type CodigoRequisitoSenha = "tamanho" | "maiuscula" | "minuscula" | "numero" | "simbolo";

export type RequisitoSenha = {
  codigo: CodigoRequisitoSenha;
  descricao: string;
  atendido: boolean;
};

export const TAMANHO_MINIMO_SENHA = 8;
export const TAMANHO_MAXIMO_SENHA = 64;
const LIMITE_BYTES_BCRYPT = 72;
const CUSTO_HASH = 12;

const REQUISITOS: { codigo: CodigoRequisitoSenha; descricao: string; teste: (senha: string) => boolean }[] = [
  { codigo: "tamanho", descricao: `Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`, teste: (senha) => [...senha].length >= TAMANHO_MINIMO_SENHA },
  { codigo: "maiuscula", descricao: "Uma letra maiúscula", teste: (senha) => /\p{Lu}/u.test(senha) },
  { codigo: "minuscula", descricao: "Uma letra minúscula", teste: (senha) => /\p{Ll}/u.test(senha) },
  { codigo: "numero", descricao: "Um número", teste: (senha) => /\p{N}/u.test(senha) },
  { codigo: "simbolo", descricao: "Um símbolo, como ! @ # $ %", teste: (senha) => /[^\p{L}\p{N}\s]/u.test(senha) },
];

// Rubrica de Back-end - Cadastro de Usuário - Validação de nível de senha
export function avaliarSenha(senha: string): RequisitoSenha[] {
  return REQUISITOS.map(({ codigo, descricao, teste }) => ({ codigo, descricao, atendido: teste(senha) }));
}

export function senhaLongaDemais(senha: string): boolean {
  return [...senha].length > TAMANHO_MAXIMO_SENHA || Buffer.byteLength(senha, "utf8") > LIMITE_BYTES_BCRYPT;
}

export function senhaForte(senha: string): boolean {
  return !senhaLongaDemais(senha) && avaliarSenha(senha).every((requisito) => requisito.atendido);
}

export function mensagemSenhaFraca(senha: string): string {
  if (senhaLongaDemais(senha)) {
    return `A senha pode ter no máximo ${TAMANHO_MAXIMO_SENHA} caracteres.`;
  }
  const faltando = avaliarSenha(senha).filter((requisito) => !requisito.atendido).map((requisito) => requisito.descricao.toLowerCase());
  return `A senha precisa ter: ${faltando.join(", ")}.`;
}

export class Senha {
  readonly #hash: string;

  // Rubrica de Tech Forge - Encapsulamento e Proteção do Estado - Construtores limpos com a devida inicialização das propriedades
  private constructor(hash: string) {
    this.#hash = hash;
  }

  // Rubrica de Back-end - Autenticação - Senha criptografada no banco
  static async criar(textoPuro: string): Promise<Senha> {
    if (!senhaForte(textoPuro)) {
      throw new ErroValidacao("Senha fraca.", { senha: mensagemSenhaFraca(textoPuro) });
    }
    return new Senha(await bcrypt.hash(textoPuro, CUSTO_HASH));
  }

  static aPartirDoHash(hash: string): Senha {
    return new Senha(hash);
  }

  confere(textoPuro: string): Promise<boolean> {
    return bcrypt.compare(textoPuro, this.#hash);
  }

  get hash(): string {
    return this.#hash;
  }
}
