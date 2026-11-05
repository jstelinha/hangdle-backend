export const FUSO_DO_JOGO = "America/Sao_Paulo";

const formato = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_DO_JOGO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function diaNoFuso(instante: Date): string {
  const partes = Object.fromEntries(formato.formatToParts(instante).map((parte) => [parte.type, parte.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

export function diaAnterior(dia: string): string {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 1);
  return data.toISOString().slice(0, 10);
}
