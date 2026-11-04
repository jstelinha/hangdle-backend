import type { PalavraDoDia } from "./PalavraDoDia.js";

export type ResultadoDiario = PalavraDoDia & {
  letras: string[];
  chutes: number;
  erros: number;
  acertou: boolean;
};
