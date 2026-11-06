import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import type { Participante } from "../dominio/Participante.js";
import { ErroConflito, ErroNaoEncontrado, ErroProibido, type ErroAplicacao } from "../erros/ErroAplicacao.js";
import type { DadosEdicaoParticipante, DadosEntrada } from "../esquemas/participante.js";
import { erroJaEstaNaSala, erroSalaCheia, type RepositorioParticipantes } from "../repositorios/RepositorioParticipantes.js";
import { ServicoComDono } from "./ServicoComDono.js";
import type { ServicoSalas } from "./ServicoSalas.js";

export class ServicoParticipantes extends ServicoComDono<Participante> {
  protected override readonly naoEncontrado = "Jogador não encontrado nesta sala.";
  readonly #participantes: RepositorioParticipantes;
  readonly #salas: ServicoSalas;

  constructor(participantes: RepositorioParticipantes, salas: ServicoSalas) {
    super();
    this.#participantes = participantes;
    this.#salas = salas;
  }

  async listar(usuarioId: number, salaId: number, pedido: PedidoDePagina): Promise<Pagina<Participante>> {
    await this.#conferirQueEstaNaSala(usuarioId, salaId);
    return this.#participantes.listar(salaId, pedido);
  }

  buscar(usuarioId: number, salaId: number, id: number): Promise<Participante> {
    return this.#encontrarNaSala(usuarioId, salaId, id);
  }

  async entrar(usuarioId: number, salaId: number, { apelido, senha }: DadosEntrada): Promise<Participante> {
    const sala = await this.#salas.buscar(salaId);
    if (await this.#participantes.buscarNaSala(salaId, usuarioId)) {
      throw erroJaEstaNaSala();
    }
    if (sala.situacao === "encerrada") {
      throw new ErroConflito("Essa sala já foi encerrada.");
    }
    await this.#salas.conferirSenha(sala, senha);
    if (sala.jogadores >= sala.maximoDeJogadores) {
      throw erroSalaCheia();
    }
    return this.#participantes.criar(salaId, { usuarioId, apelido });
  }

  async editar(usuarioId: number, salaId: number, id: number, { apelido }: DadosEdicaoParticipante): Promise<Participante> {
    const participante = await this.#encontrarNaSala(usuarioId, salaId, id);
    if (participante.usuarioId !== usuarioId) {
      throw new ErroProibido("Você só pode trocar o seu próprio apelido.");
    }
    await this.#participantes.atualizar(id, { apelido });
    return { ...participante, apelido };
  }

  // Cada um sai quando quer; quem criou a sala também pode tirar alguém, mas não sai: apaga a sala.
  async sair(usuarioId: number, salaId: number, id: number): Promise<void> {
    const participante = await this.#encontrarNaSala(usuarioId, salaId, id);
    if (participante.dono) {
      throw new ErroConflito("Quem criou a sala não sai dela. Para acabar com a sala, apague a sala.");
    }
    const sala = await this.#salas.buscar(salaId);
    if (participante.usuarioId !== usuarioId && sala.donoId !== usuarioId) {
      throw new ErroProibido("Só quem criou a sala pode tirar outra pessoa.");
    }
    await this.#participantes.apagar(id);
  }

  protected override buscarPorId(id: number): Promise<Participante | null> {
    return this.#participantes.buscar(id);
  }

  protected override donoDe(participante: Participante): number {
    return participante.salaId;
  }

  protected override erroDeOutroDono(): ErroAplicacao {
    return new ErroNaoEncontrado(this.naoEncontrado);
  }

  async #conferirQueEstaNaSala(usuarioId: number, salaId: number): Promise<void> {
    await this.#salas.buscar(salaId);
    if (!(await this.#participantes.buscarNaSala(salaId, usuarioId))) {
      throw new ErroProibido("Entre na sala para ver quem está nela.");
    }
  }

  async #encontrarNaSala(usuarioId: number, salaId: number, id: number): Promise<Participante> {
    await this.#conferirQueEstaNaSala(usuarioId, salaId);
    return this.encontrarDoDono(salaId, id);
  }
}
