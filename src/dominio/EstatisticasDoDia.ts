export type FaixaDeLetras = {
  letras: number;
  jogadores: number;
};

export type EstatisticasDoDia = {
  dia: string;
  jogadores: number;
  naoAcertaram: number;
  distribuicao: FaixaDeLetras[];
};

export type ContagemDoDia = {
  acertou: boolean;
  chutes: number;
  jogadores: number;
};

// Rubrica de Probabilidade e Estatística - Análise Descritiva - Desenvolver métricas adequadas aos objetivos de negócio
export function resumirDia(dia: string, contagens: ContagemDoDia[]): EstatisticasDoDia {
  const acertaram = contagens.filter((contagem) => contagem.acertou);
  return {
    dia,
    jogadores: contagens.reduce((total, contagem) => total + contagem.jogadores, 0),
    naoAcertaram: contagens.filter((contagem) => !contagem.acertou).reduce((total, contagem) => total + contagem.jogadores, 0),
    distribuicao: acertaram
      .map((contagem) => ({ letras: contagem.chutes, jogadores: contagem.jogadores }))
      .sort((a, b) => a.letras - b.letras),
  };
}
