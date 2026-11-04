import type { ResultadoDiario } from "../dominio/ResultadoDiario.js";
import { ErroConflito } from "../erros/ErroAplicacao.js";

export interface RepositorioResultados {
  salvar(usuarioId: number, resultado: ResultadoDiario): Promise<void>;
  listar(usuarioId: number, dia?: string): Promise<ResultadoDiario[]>;
}

const JA_JOGOU = "Você já jogou a palavra deste dia.";

export function erroJaJogou(): ErroConflito {
  return new ErroConflito(JA_JOGOU, { dia: JA_JOGOU });
}
