import { ErroValidacao } from "../erros/ErroAplicacao.js";
import { LIMITE_BYTES_BCRYPT, SenhaCriptografada } from "./SenhaCriptografada.js";

export const TAMANHO_MINIMO_SENHA_DA_SALA = 4;
export const TAMANHO_MAXIMO_SENHA_DA_SALA = 30;
export const MENSAGEM_SENHA_DA_SALA = `A senha da sala precisa ter de ${TAMANHO_MINIMO_SENHA_DA_SALA} a ${TAMANHO_MAXIMO_SENHA_DA_SALA} caracteres.`;
// A senha da sala só protege a entrada numa partida: um custo menor deixa a entrada mais rápida.
const CUSTO_HASH = 10;

export function senhaDaSalaValida(texto: string): boolean {
  const tamanho = [...texto].length;
  return (
    tamanho >= TAMANHO_MINIMO_SENHA_DA_SALA &&
    tamanho <= TAMANHO_MAXIMO_SENHA_DA_SALA &&
    Buffer.byteLength(texto, "utf8") <= LIMITE_BYTES_BCRYPT
  );
}

export class SenhaDaSala extends SenhaCriptografada {
  private constructor(hash: string) {
    super(hash);
  }

  static async criar(textoPuro: string): Promise<SenhaDaSala> {
    if (!senhaDaSalaValida(textoPuro)) {
      throw new ErroValidacao("Senha da sala inválida.", { senha: MENSAGEM_SENHA_DA_SALA });
    }
    return new SenhaDaSala(await SenhaDaSala.gerarHash(textoPuro, CUSTO_HASH));
  }

  static aPartirDoHash(hash: string): SenhaDaSala {
    return new SenhaDaSala(hash);
  }
}
