import { ErroConflito, ErroValidacao, type ErroAplicacao } from "../erros/ErroAplicacao.js";
import { Partida, type LetraRecusada } from "./Partida.js";

export const PONTOS = {
  porAcerto: 100,
  menosPorErro: 10,
  primeiroAAcertar: 20,
  deQuemEscolheuPorAcerto: 10,
} as const;

// A forca de um jogador numa vez da sala: as letras chegam uma por uma, enquanto o tempo corre.
export class PartidaNaSala extends Partida {
  constructor(palavra: string) {
    super(palavra);
  }

  chutar(letra: string): boolean {
    return this.chutarLetra(letra);
  }

  pontos(primeiroAAcertar: boolean): number {
    if (!this.acertou) {
      return 0;
    }
    const bonus = primeiroAAcertar ? PONTOS.primeiroAAcertar : 0;
    return PONTOS.porAcerto - PONTOS.menosPorErro * this.erros + bonus;
  }

  // Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Polimorfismo: a mesma recusa vira 400 ou 409, conforme a partida
  protected override recusar(recusa: LetraRecusada): ErroAplicacao {
    switch (recusa.motivo) {
      case "invalida":
        return new ErroValidacao("Envie uma letra de A a Z.", { letra: "Envie uma letra de A a Z." });
      case "repetida":
        return new ErroConflito(`Você já chutou a letra ${recusa.letra}.`, { letra: `Você já chutou a letra ${recusa.letra}.` });
      case "depoisDoFim":
        return new ErroConflito("A sua forca nesta vez já terminou.");
    }
  }
}
