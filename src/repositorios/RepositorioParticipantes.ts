import type { EdicaoParticipante, NovoParticipante, Participante } from "../dominio/Participante.js";
import { ErroConflito } from "../erros/ErroAplicacao.js";
import type { RepositorioDeRecursos } from "./RepositorioDeRecursos.js";

export interface RepositorioParticipantes extends RepositorioDeRecursos<Participante, NovoParticipante, EdicaoParticipante> {
  buscarNaSala(salaId: number, usuarioId: number): Promise<Participante | null>;
}

const APELIDO_REPETIDO = "Esse apelido já está em uso nesta sala.";

export function erroApelidoRepetido(): ErroConflito {
  return new ErroConflito(APELIDO_REPETIDO, { apelido: APELIDO_REPETIDO });
}

export function erroJaEstaNaSala(): ErroConflito {
  return new ErroConflito("Você já está nesta sala.");
}

export function erroSalaCheia(): ErroConflito {
  return new ErroConflito("A sala está cheia.");
}
