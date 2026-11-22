import type { Pagina } from "../dominio/Pagina.js";
import { apelidoDoNome } from "../dominio/Participante.js";
import { SALA_NAO_ENCONTRADA, type Sala } from "../dominio/Sala.js";
import { SenhaDaSala } from "../dominio/SenhaDaSala.js";
import { ErroConflito, ErroNaoEncontrado, ErroProibido, type ErroAplicacao } from "../erros/ErroAplicacao.js";
import type { DadosEdicaoSala, DadosNovaSala, FiltroSalas } from "../esquemas/sala.js";
import type { RepositorioParticipantes } from "../repositorios/RepositorioParticipantes.js";
import type { RepositorioSalas } from "../repositorios/RepositorioSalas.js";
import type { RepositorioUsuarios } from "../repositorios/RepositorioUsuarios.js";
import type { AndamentoDaPartida } from "./AndamentoDaPartida.js";
import { ServicoComDono } from "./ServicoComDono.js";
import type { ServicoListas } from "./ServicoListas.js";

const PARTIDA_COMECOU = "A partida já começou. Não dá mais para mudar a sala.";
const PEDE_SENHA = "Esta sala tem senha. Digite a senha para entrar.";
const SENHA_ERRADA = "Senha da sala incorreta.";

export class ServicoSalas extends ServicoComDono<Sala> {
  protected override readonly naoEncontrado = SALA_NAO_ENCONTRADA;
  readonly #salas: RepositorioSalas;
  readonly #participantes: RepositorioParticipantes;
  readonly #listas: ServicoListas;
  readonly #usuarios: RepositorioUsuarios;
  readonly #andamento: AndamentoDaPartida;

  constructor(
    salas: RepositorioSalas,
    participantes: RepositorioParticipantes,
    listas: ServicoListas,
    usuarios: RepositorioUsuarios,
    andamento: AndamentoDaPartida,
  ) {
    super();
    this.#salas = salas;
    this.#participantes = participantes;
    this.#listas = listas;
    this.#usuarios = usuarios;
    this.#andamento = andamento;
  }

  // A partida das salas jogando anda antes de elas aparecerem. Se alguma acabou, a página vem de novo:
  // nas abertas, a sala encerrada sai e outra entra no lugar. Cada volta encerra de vez alguma sala, então isto para.
  async listar(usuarioId: number, { filtro, ...pedido }: FiltroSalas): Promise<Pagina<Sala>> {
    const buscarPagina = () => (filtro === "minhas" ? this.#salas.listar(usuarioId, pedido) : this.#salas.listarAbertas(pedido));
    let pagina = await buscarPagina();
    while (await this.#algumaAcabou(pagina.itens)) {
      pagina = await buscarPagina();
    }
    return pagina;
  }

  // Qualquer pessoa com login vê os dados da sala, para decidir se entra: a senha nunca sai daqui.
  async buscar(id: number): Promise<Sala> {
    const sala = await this.#salas.buscar(id);
    const emDia = sala && (await this.#emDia(sala));
    if (!emDia) {
      throw new ErroNaoEncontrado(this.naoEncontrado);
    }
    return emDia;
  }

  async criar(usuarioId: number, { senha, ...configuracao }: DadosNovaSala): Promise<Sala> {
    await this.#conferirLista(usuarioId, configuracao.listaId);
    const usuario = await this.#usuarios.buscarPorId(usuarioId);
    if (!usuario) {
      throw new ErroNaoEncontrado("Usuário não encontrado.");
    }
    const senhaHash = senha === null ? null : (await SenhaDaSala.criar(senha)).hash;
    const sala = await this.#salas.criar(usuarioId, { ...configuracao, senhaHash });
    await this.#participantes.criar(sala.id, { usuarioId, apelido: apelidoDoNome(usuario.paraResposta().nome) });
    return { ...sala, jogadores: 1 };
  }

  async editar(usuarioId: number, id: number, { senha, ...configuracao }: DadosEdicaoSala): Promise<Sala> {
    const sala = await this.encontrarDoDono(usuarioId, id);
    if (sala.situacao !== "esperando") {
      throw new ErroConflito(PARTIDA_COMECOU);
    }
    if (configuracao.maximoDeJogadores < sala.jogadores) {
      const mensagem = `Já há ${sala.jogadores} jogadores na sala.`;
      throw new ErroConflito(mensagem, { maximoDeJogadores: mensagem });
    }
    await this.#conferirLista(usuarioId, configuracao.listaId);
    const senhaHash = await this.#novoHash(id, senha);
    await this.#salas.atualizar(id, { ...configuracao, senhaHash });
    return { ...sala, ...configuracao, privada: senhaHash !== null };
  }

  async apagar(usuarioId: number, id: number): Promise<void> {
    await this.encontrarDoDono(usuarioId, id);
    await this.#salas.apagar(id);
  }

  async conferirSenha(sala: Sala, senha: string | null | undefined): Promise<void> {
    if (!sala.privada) {
      return;
    }
    if (!senha) {
      throw new ErroProibido(PEDE_SENHA, { senha: PEDE_SENHA });
    }
    const guardada = await this.#salas.buscarSenha(sala.id);
    if (!guardada || !(await guardada.confere(senha))) {
      throw new ErroProibido(SENHA_ERRADA, { senha: SENHA_ERRADA });
    }
  }

  protected override buscarPorId(id: number): Promise<Sala | null> {
    return this.#salas.buscar(id);
  }

  protected override donoDe(sala: Sala): number {
    return sala.donoId;
  }

  protected override erroDeOutroDono(): ErroAplicacao {
    return new ErroProibido("Só quem criou a sala pode mudar ou apagar a sala.");
  }

  // A sala jogando pode ter ficado parada no tempo, se ninguém está na tela da partida. Null: foi apagada nesse meio-tempo.
  async #emDia(sala: Sala): Promise<Sala | null> {
    return sala.situacao === "jogando" ? ((await this.#andamento.avancar(sala.id))?.sala ?? null) : sala;
  }

  async #algumaAcabou(salas: readonly Sala[]): Promise<boolean> {
    let acabou = false;
    for (const sala of salas) {
      acabou = (await this.#emDia(sala))?.situacao !== sala.situacao || acabou;
    }
    return acabou;
  }

  async #conferirLista(usuarioId: number, listaId: number | null): Promise<void> {
    if (listaId !== null) {
      await this.#listas.buscar(usuarioId, listaId);
    }
  }

  async #novoHash(id: number, senha: string | null | undefined): Promise<string | null> {
    if (senha === undefined) {
      return (await this.#salas.buscarSenha(id))?.hash ?? null;
    }
    return senha === null ? null : (await SenhaDaSala.criar(senha)).hash;
  }
}
