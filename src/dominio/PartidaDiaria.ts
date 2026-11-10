import { ErroValidacao, type ErroAplicacao } from "../erros/ErroAplicacao.js";
import { Partida, type LetraRecusada } from "./Partida.js";

function recusarAsLetras(mensagem: string): ErroValidacao {
  return new ErroValidacao(mensagem, { letras: mensagem });
}

// Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Entidade que representa a regra do jogo
export class PartidaDiaria extends Partida {
  // A partida do dia chega inteira: as letras na ordem em que foram chutadas, até o fim.
  constructor(palavra: string, letras: readonly string[]) {
    super(palavra);
    letras.forEach((letra) => this.chutarLetra(letra));
    if (!this.terminou) {
      throw recusarAsLetras("A partida ainda não terminou.");
    }
  }

  protected override recusar(recusa: LetraRecusada): ErroAplicacao {
    switch (recusa.motivo) {
      case "invalida":
        return recusarAsLetras("Envie só letras de A a Z.");
      case "repetida":
        return recusarAsLetras(`A letra ${recusa.letra} foi enviada mais de uma vez.`);
      case "depoisDoFim":
        return recusarAsLetras("Há letras depois do fim da partida.");
    }
  }
}
