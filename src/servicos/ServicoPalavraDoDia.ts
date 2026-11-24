import { diaAnterior, diaNoFuso } from "../dominio/dia.js";
import { ForcaDoDia, type JogoDoDia } from "../dominio/ForcaDoDia.js";
import type { PalavraDoDia } from "../dominio/PalavraDoDia.js";
import { ErroConflito, ErroIndisponivel, ErroValidacao } from "../erros/ErroAplicacao.js";
import type { DadosJogadaDoDia } from "../esquemas/palavraDoDia.js";
import type { RepositorioPalavrasDoDia } from "../repositorios/RepositorioPalavrasDoDia.js";
import type { TokenDoJogo } from "./TokenDoJogo.js";

const TOKEN_INVALIDO = "Esta partida não é válida. Recarregue a página para começar de novo.";
const OUTRO_DIA = "Esta partida é de outro dia. Recarregue a página para jogar a palavra de hoje.";

// A palavra fica só aqui: quem joga recebe as casas abertas e, só no fim, a palavra.
export class ServicoPalavraDoDia {
  readonly #palavras: RepositorioPalavrasDoDia;
  readonly #agora: () => Date;
  readonly #tokens: TokenDoJogo;

  constructor(palavras: RepositorioPalavrasDoDia, agora: () => Date, tokens: TokenDoJogo) {
    this.#palavras = palavras;
    this.#agora = agora;
    this.#tokens = tokens;
  }

  async deHoje(): Promise<PalavraDoDia> {
    const dia = diaNoFuso(this.#agora());
    const palavra = (await this.#palavras.buscar(dia)) ?? (await this.#palavras.sortear(dia));
    if (!palavra) {
      throw new ErroIndisponivel("Ainda não há palavras cadastradas para o jogo.");
    }
    return palavra;
  }

  // A partida de hoje, sem nenhuma letra: as casas fechadas e o token para mandar com a primeira letra.
  async comecar(): Promise<JogoDoDia> {
    return this.#responder(new ForcaDoDia(await this.deHoje(), []));
  }

  // Refaz a partida com as letras do token e chuta a nova. Dá para terminar a partida de ontem, para quem joga perto
  // da meia-noite, como no POST /resultados.
  async chutar({ token, letra }: DadosJogadaDoDia): Promise<JogoDoDia> {
    const jogadas = this.#tokens.ler(token);
    if (!jogadas) {
      throw new ErroValidacao(TOKEN_INVALIDO, { token: TOKEN_INVALIDO });
    }
    const hoje = diaNoFuso(this.#agora());
    const deHojeOuOntem = jogadas.dia === hoje || jogadas.dia === diaAnterior(hoje);
    const palavraDoDia = deHojeOuOntem ? await this.#palavras.buscar(jogadas.dia) : null;
    if (!palavraDoDia) {
      throw new ErroConflito(OUTRO_DIA);
    }
    const forca = new ForcaDoDia(palavraDoDia, jogadas.letras);
    forca.chutar(letra);
    return this.#responder(forca);
  }

  #responder(forca: ForcaDoDia): JogoDoDia {
    return forca.paraQuemJoga(this.#tokens.assinar(forca.jogadas));
  }
}
