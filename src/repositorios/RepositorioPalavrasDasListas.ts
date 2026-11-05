import type { PalavraDaLista } from "../dominio/PalavraDaLista.js";
import { ErroConflito } from "../erros/ErroAplicacao.js";
import type { DadosPalavra } from "../esquemas/palavraDaLista.js";
import type { RepositorioDeRecursos } from "./RepositorioDeRecursos.js";

export type RepositorioPalavrasDasListas = RepositorioDeRecursos<PalavraDaLista, DadosPalavra>;

const PALAVRA_REPETIDA = "Essa palavra já está na lista.";

export function erroPalavraRepetida(): ErroConflito {
  return new ErroConflito(PALAVRA_REPETIDA, { palavra: PALAVRA_REPETIDA });
}
