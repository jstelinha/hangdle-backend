import type { Lista } from "../dominio/Lista.js";
import { ErroConflito } from "../erros/ErroAplicacao.js";
import type { DadosLista } from "../esquemas/lista.js";
import type { RepositorioDeRecursos } from "./RepositorioDeRecursos.js";

export type RepositorioListas = RepositorioDeRecursos<Lista, DadosLista>;

const LISTA_REPETIDA = "Você já tem uma lista com esse nome.";

export function erroListaRepetida(): ErroConflito {
  return new ErroConflito(LISTA_REPETIDA, { nome: LISTA_REPETIDA });
}
