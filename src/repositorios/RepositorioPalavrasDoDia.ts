import type { PalavraDoDia } from "../dominio/PalavraDoDia.js";

export interface RepositorioPalavrasDoDia {
  buscar(dia: string): Promise<PalavraDoDia | null>;
  sortear(dia: string): Promise<PalavraDoDia | null>;
}
