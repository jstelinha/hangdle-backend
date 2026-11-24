import type { Pagina, PedidoDePagina } from "../../src/dominio/Pagina.js";
import type { EdicaoParticipante, NovoParticipante, Participante } from "../../src/dominio/Participante.js";
import {
  erroApelidoRepetido,
  erroJaEstaNaSala,
  erroSalaCheia,
  type RepositorioParticipantes,
} from "../../src/repositorios/RepositorioParticipantes.js";
import { mesmoTexto, paginarEmMemoria } from "./paginarEmMemoria.js";

export type DadosDaSala = { donoId: number; maximoDeJogadores: number };
type Registro = Omit<Participante, "dono">;

export class RepositorioParticipantesMemoria implements RepositorioParticipantes {
  readonly #participantes = new Map<number, Registro>();
  readonly #salaDe: (salaId: number) => DadosDaSala | null;
  #proximoId = 1;

  constructor(salaDe: (salaId: number) => DadosDaSala | null) {
    this.#salaDe = salaDe;
  }

  async listar(salaId: number, pedido: PedidoDePagina): Promise<Pagina<Participante>> {
    return paginarEmMemoria(
      this.#daSala(salaId).map((registro) => this.#comDono(registro)),
      pedido,
    );
  }

  async buscar(id: number): Promise<Participante | null> {
    const registro = this.#participantes.get(id);
    return registro ? this.#comDono(registro) : null;
  }

  async buscarNaSala(salaId: number, usuarioId: number): Promise<Participante | null> {
    const registro = this.#daSala(salaId).find((participante) => participante.usuarioId === usuarioId);
    return registro ? this.#comDono(registro) : null;
  }

  async criar(salaId: number, { usuarioId, apelido }: NovoParticipante): Promise<Participante> {
    const sala = this.#salaDe(salaId);
    if (sala && this.contar(salaId) >= sala.maximoDeJogadores) {
      throw erroSalaCheia();
    }
    if (this.participa(salaId, usuarioId)) {
      throw erroJaEstaNaSala();
    }
    this.#recusarApelido(salaId, apelido);
    const registro = { id: this.#proximoId++, salaId, usuarioId, apelido, pontos: 0 };
    this.#participantes.set(registro.id, registro);
    return this.#comDono(registro);
  }

  async atualizar(id: number, { apelido }: EdicaoParticipante): Promise<void> {
    const registro = this.#participantes.get(id);
    if (registro) {
      this.#recusarApelido(registro.salaId, apelido, id);
      this.#participantes.set(id, { ...registro, apelido });
    }
  }

  async apagar(id: number): Promise<void> {
    this.#participantes.delete(id);
  }

  apagarDaSala(salaId: number): void {
    for (const participante of this.#daSala(salaId)) {
      this.#participantes.delete(participante.id);
    }
  }

  contar(salaId: number): number {
    return this.#daSala(salaId).length;
  }

  existe(id: number): boolean {
    return this.#participantes.has(id);
  }

  zerarPontos(salaId: number): void {
    for (const participante of this.#daSala(salaId)) {
      this.#participantes.set(participante.id, { ...participante, pontos: 0 });
    }
  }

  somarPontos(id: number, pontos: number): void {
    const registro = this.#participantes.get(id);
    if (registro) {
      this.#participantes.set(id, { ...registro, pontos: registro.pontos + pontos });
    }
  }

  participa(salaId: number, usuarioId: number): boolean {
    return this.#daSala(salaId).some((participante) => participante.usuarioId === usuarioId);
  }

  #daSala(salaId: number): Registro[] {
    return [...this.#participantes.values()].filter((participante) => participante.salaId === salaId);
  }

  #comDono(registro: Registro): Participante {
    return { ...registro, dono: this.#salaDe(registro.salaId)?.donoId === registro.usuarioId };
  }

  #recusarApelido(salaId: number, apelido: string, ignorarId?: number): void {
    if (this.#daSala(salaId).some((participante) => participante.id !== ignorarId && mesmoTexto(participante.apelido, apelido))) {
      throw erroApelidoRepetido();
    }
  }
}
