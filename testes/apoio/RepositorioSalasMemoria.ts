import type { Pagina, PedidoDePagina } from "../../src/dominio/Pagina.js";
import type { RegistroSala, Sala, SituacaoDaSala } from "../../src/dominio/Sala.js";
import { SenhaDaSala } from "../../src/dominio/SenhaDaSala.js";
import type { RepositorioSalas } from "../../src/repositorios/RepositorioSalas.js";
import { paginarEmMemoria } from "./paginarEmMemoria.js";
import type { DadosDaSala, RepositorioParticipantesMemoria } from "./RepositorioParticipantesMemoria.js";

type Registro = RegistroSala & { id: number; donoId: number; situacao: SituacaoDaSala };

export class RepositorioSalasMemoria implements RepositorioSalas {
  readonly #salas = new Map<number, Registro>();
  readonly #participantes: () => RepositorioParticipantesMemoria;
  #proximoId = 1;

  // Recebe uma função porque os dois repositórios em memória se conhecem: um conta os jogadores, o outro sabe quem é o dono.
  constructor(participantes: () => RepositorioParticipantesMemoria) {
    this.#participantes = participantes;
  }

  async listar(usuarioId: number, pedido: PedidoDePagina): Promise<Pagina<Sala>> {
    return this.#paginar((sala) => this.#participantes().participa(sala.id, usuarioId), pedido);
  }

  async listarAbertas(pedido: PedidoDePagina): Promise<Pagina<Sala>> {
    return this.#paginar((sala) => sala.senhaHash === null && sala.situacao !== "encerrada", pedido);
  }

  async buscar(id: number): Promise<Sala | null> {
    const registro = this.#salas.get(id);
    return registro ? this.#paraSala(registro) : null;
  }

  async buscarSenha(id: number): Promise<SenhaDaSala | null> {
    const hash = this.#salas.get(id)?.senhaHash;
    return hash ? SenhaDaSala.aPartirDoHash(hash) : null;
  }

  async criar(donoId: number, registro: RegistroSala): Promise<Sala> {
    const sala: Registro = { ...registro, id: this.#proximoId++, donoId, situacao: "esperando" };
    this.#salas.set(sala.id, sala);
    return this.#paraSala(sala);
  }

  async atualizar(id: number, registro: RegistroSala): Promise<void> {
    const sala = this.#salas.get(id);
    if (sala) {
      this.#salas.set(id, { ...sala, ...registro });
    }
  }

  async apagar(id: number): Promise<void> {
    this.#salas.delete(id);
    this.#participantes().apagarDaSala(id);
  }

  dadosDaSala(id: number): DadosDaSala | null {
    const sala = this.#salas.get(id);
    return sala ? { donoId: sala.donoId, maximoDeJogadores: sala.maximoDeJogadores } : null;
  }

  mudarSituacao(id: number, situacao: SituacaoDaSala): void {
    const sala = this.#salas.get(id);
    if (sala) {
      this.#salas.set(id, { ...sala, situacao });
    }
  }

  #paginar(filtro: (sala: Registro) => boolean, pedido: PedidoDePagina): Pagina<Sala> {
    const escolhidas = [...this.#salas.values()]
      .filter(filtro)
      .sort((a, b) => b.id - a.id)
      .map((sala) => this.#paraSala(sala));
    return paginarEmMemoria(escolhidas, pedido);
  }

  #paraSala({ senhaHash, ...sala }: Registro): Sala {
    return { ...sala, privada: senhaHash !== null, jogadores: this.#participantes().contar(sala.id) };
  }
}
