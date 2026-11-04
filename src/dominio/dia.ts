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
