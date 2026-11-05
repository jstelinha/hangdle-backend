import type { ContagemDoDia } from "../../src/dominio/EstatisticasDoDia.js";
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

  async contarDoDia(dia: string): Promise<ContagemDoDia[]> {
    const contagens = new Map<string, ContagemDoDia>();
    for (const resultado of [...this.#porUsuario.values()].flat().filter((resultado) => resultado.dia === dia)) {
      const chave = `${resultado.acertou}-${resultado.chutes}`;
      const atual = contagens.get(chave) ?? { acertou: resultado.acertou, chutes: resultado.chutes, jogadores: 0 };
      contagens.set(chave, { ...atual, jogadores: atual.jogadores + 1 });
    }
    return [...contagens.values()];
  }
}
