import type { ResultadoDiario } from "../../src/dominio/ResultadoDiario.js";
import { erroJaJogou, type RepositorioResultados } from "../../src/repositorios/RepositorioResultados.js";

export class RepositorioResultadosMemoria implements RepositorioResultados {
  readonly #porUsuario = new Map<number, ResultadoDiario[]>();

  async salvar(usuarioId: number, resultado: ResultadoDiario): Promise<void> {
    const doUsuario = this.#porUsuario.get(usuarioId) ?? [];
    if (doUsuario.some((existente) => existente.dia === resultado.dia)) {
      throw erroJaJogou();
    }
    this.#porUsuario.set(usuarioId, [...doUsuario, resultado]);
  }

  async listar(usuarioId: number, dia?: string): Promise<ResultadoDiario[]> {
    return (this.#porUsuario.get(usuarioId) ?? [])
      .filter((resultado) => dia === undefined || resultado.dia === dia)
      .sort((a, b) => b.dia.localeCompare(a.dia));
  }
}
