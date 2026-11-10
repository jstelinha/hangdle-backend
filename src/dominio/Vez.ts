export const SEGUNDOS_PARA_ESCOLHER = 20;
export const SEGUNDOS_ENTRE_AS_VEZES = 5;

// Intervalo: mostra como foi a vez anterior. Escolhendo: quem está na vez escolhe a palavra. Adivinhando: os outros chutam.
export type FaseDaVez = "intervalo" | "escolhendo" | "adivinhando" | "terminada";

export type PalavraEscolhida = { palavra: string; dica: string | null };

export type RegistroVez = {
  id: number;
  numero: number;
  rodada: number;
  escolhedorId: number;
  palavra: string | null;
  dica: string | null;
  comecaEm: Date;
  escolhidaEm: Date | null;
  terminouEm: Date | null;
};

export type NovaVez = Pick<RegistroVez, "numero" | "rodada" | "escolhedorId" | "comecaEm">;

function somarSegundos(data: Date, segundos: number): Date {
  return new Date(data.getTime() + segundos * 1000);
}

export function faseDaVez(vez: RegistroVez, agora: Date): FaseDaVez {
  if (vez.terminouEm) {
    return "terminada";
  }
  if (vez.escolhidaEm) {
    return "adivinhando";
  }
  return agora < vez.comecaEm ? "intervalo" : "escolhendo";
}

// Até quando vai a fase em que a vez está agora; a vez terminada não tem prazo.
export function prazoDaVez(vez: RegistroVez, segundosParaAdivinhar: number, agora: Date): Date | null {
  switch (faseDaVez(vez, agora)) {
    case "intervalo":
      return vez.comecaEm;
    case "escolhendo":
      return somarSegundos(vez.comecaEm, SEGUNDOS_PARA_ESCOLHER);
    case "adivinhando":
      return somarSegundos(vez.escolhidaEm ?? vez.comecaEm, segundosParaAdivinhar);
    case "terminada":
      return null;
  }
}

export function segundosRestantes(prazo: Date | null, agora: Date): number {
  return prazo ? Math.max(0, Math.ceil((prazo.getTime() - agora.getTime()) / 1000)) : 0;
}

// Em cada rodada, cada jogador escolhe uma palavra, na ordem em que entrou na sala (a ordem do id).
// Quem chega no meio entra no fim da fila; quem sai é pulado. Sem próxima vez, a partida acabou.
export function proximaVez(anterior: RegistroVez | null, jogadores: readonly number[], rodadas: number, agora: Date): NovaVez | null {
  const ordem = [...jogadores].sort((a, b) => a - b);
  const primeiro = ordem[0];
  if (primeiro === undefined) {
    return null;
  }
  if (!anterior) {
    return { numero: 1, rodada: 1, escolhedorId: primeiro, comecaEm: agora };
  }
  const depoisDoIntervalo = somarSegundos(anterior.terminouEm ?? agora, SEGUNDOS_ENTRE_AS_VEZES);
  const comecaEm = depoisDoIntervalo > agora ? depoisDoIntervalo : agora;
  const numero = anterior.numero + 1;
  const seguinte = ordem.find((id) => id > anterior.escolhedorId);
  if (seguinte !== undefined) {
    return { numero, rodada: anterior.rodada, escolhedorId: seguinte, comecaEm };
  }
  if (anterior.rodada >= rodadas) {
    return null;
  }
  return { numero, rodada: anterior.rodada + 1, escolhedorId: primeiro, comecaEm };
}
