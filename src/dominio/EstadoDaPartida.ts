import type { SituacaoDaSala } from "./Sala.js";
import type { FaseDaVez, OpcaoDePalavra } from "./Vez.js";

export type Jogador = { participanteId: number; apelido: string };

// A forca de quem adivinha: as casas abertas só para a própria pessoa; para os outros, só quanto falta.
export type MinhaForca = { casas: (string | null)[]; letras: string[]; erros: number; acertou: boolean; terminou: boolean };
export type ForcaDeOutro = Jogador & { erros: number; casasAbertas: number; acertou: boolean; terminou: boolean };

// Rubrica de Tech Forge - Tipagem Avançada e Recursos do TypeScript - Exclude e Omit para derivar o que cada jogador vê
export type VezEmAndamento = {
  numero: number;
  rodada: number;
  fase: Exclude<FaseDaVez, "terminada">;
  segundosRestantes: number;
  escolhedor: Jogador;
  // Só para quem escolhe, enquanto escolhe: vazio quando não há lista, e a pessoa digita a palavra.
  opcoes: OpcaoDePalavra[] | null;
  // Só para quem escolheu: a palavra inteira.
  palavra: string | null;
  dica: string | null;
  minhaForca: MinhaForca | null;
  forcas: ForcaDeOutro[];
};

export type ResultadoDeJogador = Jogador & { acertou: boolean; erros: number; pontos: number };

export type ResultadoDaVez = Omit<VezEmAndamento, "fase" | "segundosRestantes" | "opcoes" | "minhaForca" | "forcas"> & {
  palavra: string;
  pontosDeQuemEscolheu: number;
  jogadores: ResultadoDeJogador[];
};

export type EstadoDaPartida = {
  situacao: SituacaoDaSala;
  rodadas: number;
  eu: number;
  placar: (Jogador & { pontos: number })[];
  vez: VezEmAndamento | null;
  anterior: ResultadoDaVez | null;
};
