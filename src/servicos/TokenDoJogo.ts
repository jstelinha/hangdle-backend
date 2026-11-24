import { createHmac, timingSafeEqual } from "node:crypto";
import { esquemaJogadasDoToken, type JogadasDoDia } from "../esquemas/palavraDoDia.js";

// O token do jogo do dia leva o dia e as letras já chutadas, assinados com HMAC-SHA256. O front guarda o token e o
// manda de volta com cada letra. Assim a API não precisa guardar a partida de quem não tem conta, e ninguém tira uma
// letra errada da lista nem inventa outra lista: a assinatura deixa de bater.
// A chave sai do segredo do JWT, mas não é a mesma: o token do jogo não serve como login, nem o login como token do jogo.
export class TokenDoJogo {
  readonly #chave: Buffer;

  constructor(segredo: string) {
    this.#chave = createHmac("sha256", segredo).update("hangdle: token do jogo do dia").digest();
  }

  assinar(jogadas: JogadasDoDia): string {
    const corpo = Buffer.from(JSON.stringify(jogadas)).toString("base64url");
    return `${corpo}.${this.#assinatura(corpo)}`;
  }

  // Null se o token foi mexido, foi assinado com outra chave ou não tem o formato certo.
  ler(token: string): JogadasDoDia | null {
    const [corpo, assinatura, ...sobra] = token.split(".");
    if (corpo === undefined || assinatura === undefined || sobra.length > 0) {
      return null;
    }
    const esperada = Buffer.from(this.#assinatura(corpo));
    const recebida = Buffer.from(assinatura);
    if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) {
      return null;
    }
    try {
      const jogadas = esquemaJogadasDoToken.safeParse(JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")));
      return jogadas.success ? jogadas.data : null;
    } catch {
      return null;
    }
  }

  #assinatura(corpo: string): string {
    return createHmac("sha256", this.#chave).update(corpo).digest("base64url");
  }
}
