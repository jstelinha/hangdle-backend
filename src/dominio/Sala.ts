// Rubrica de Tech Forge - Tipagem Avançada e Recursos do TypeScript - Tipos derivados das listas de valores (as const)
export const SEGUNDOS_POR_RODADA = [45, 90, 120] as const;
export type SegundosPorRodada = (typeof SEGUNDOS_POR_RODADA)[number];

export const SITUACOES_DA_SALA = ["esperando", "jogando", "encerrada"] as const;
export type SituacaoDaSala = (typeof SITUACOES_DA_SALA)[number];

export const RODADAS = { minimo: 1, maximo: 5 } as const;
export const JOGADORES = { minimo: 2, maximo: 10 } as const;

export type ConfiguracaoDaSala = {
  nome: string;
  listaId: number | null;
  segundosPorRodada: SegundosPorRodada;
  rodadas: number;
  maximoDeJogadores: number;
};

export type Sala = ConfiguracaoDaSala & {
  id: number;
  donoId: number;
  privada: boolean;
  jogadores: number;
  situacao: SituacaoDaSala;
};

// O que vai para o banco: a configuração e o hash da senha, nunca a senha.
export type RegistroSala = ConfiguracaoDaSala & {
  senhaHash: string | null;
};
