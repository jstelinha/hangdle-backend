import type { LetraDoJogador } from "../dominio/ChutesDaVez.js";
import type { NovaVez, OpcaoDePalavra, PalavraEscolhida, RegistroVez } from "../dominio/Vez.js";

// Os métodos que mudam a partida só mudam se ela ainda estiver como esperado e dizem se mudaram:
// vários jogadores perguntam pela sala ao mesmo tempo, e só um deles pode virar cada vez.
export interface RepositorioVezes {
  comecarPartida(salaId: number, primeira: NovaVez): Promise<boolean>;
  encerrarPartida(salaId: number): Promise<void>;
  ultimas(salaId: number, quantas: number): Promise<RegistroVez[]>;
  criar(salaId: number, vez: NovaVez): Promise<void>;
  escolherPalavra(vezId: number, escolha: PalavraEscolhida, agora: Date): Promise<boolean>;
  terminar(vezId: number, terminouEm: Date, pontos: ReadonlyMap<number, number>): Promise<boolean>;
  letras(vezId: number): Promise<LetraDoJogador[]>;
  guardarLetra(vezId: number, chute: LetraDoJogador): Promise<void>;
  // Palavras da lista que ainda não saíram na sala, sempre as mesmas para a mesma vez.
  opcoesDaLista(salaId: number, listaId: number, vezId: number, quantas: number): Promise<OpcaoDePalavra[]>;
  // Uma palavra oficial, de preferência uma que ainda não saiu na sala, com a categoria como dica.
  sortearPalavraOficial(salaId: number): Promise<PalavraEscolhida | null>;
}
