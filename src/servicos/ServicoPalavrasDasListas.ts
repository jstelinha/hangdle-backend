import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import type { PalavraDaLista } from "../dominio/PalavraDaLista.js";
import { ErroNaoEncontrado, type ErroAplicacao } from "../erros/ErroAplicacao.js";
import type { DadosPalavra } from "../esquemas/palavraDaLista.js";
import type { RepositorioPalavrasDasListas } from "../repositorios/RepositorioPalavrasDasListas.js";
import { ServicoComDono } from "./ServicoComDono.js";
import type { ServicoListas } from "./ServicoListas.js";

export class ServicoPalavrasDasListas extends ServicoComDono<PalavraDaLista> {
  protected override readonly naoEncontrado = "Palavra não encontrada nesta lista.";
  readonly #palavras: RepositorioPalavrasDasListas;
  readonly #listas: ServicoListas;

  constructor(palavras: RepositorioPalavrasDasListas, listas: ServicoListas) {
    super();
    this.#palavras = palavras;
    this.#listas = listas;
  }

  async listar(usuarioId: number, listaId: number, pedido: PedidoDePagina): Promise<Pagina<PalavraDaLista>> {
    await this.#listas.buscar(usuarioId, listaId);
    return this.#palavras.listar(listaId, pedido);
  }

  buscar(usuarioId: number, listaId: number, id: number): Promise<PalavraDaLista> {
    return this.#encontrarNaLista(usuarioId, listaId, id);
  }

  async criar(usuarioId: number, listaId: number, dados: DadosPalavra): Promise<PalavraDaLista> {
    await this.#listas.buscar(usuarioId, listaId);
    return this.#palavras.criar(listaId, dados);
  }

  async editar(usuarioId: number, listaId: number, id: number, dados: DadosPalavra): Promise<PalavraDaLista> {
    const palavra = await this.#encontrarNaLista(usuarioId, listaId, id);
    await this.#palavras.atualizar(id, dados);
    return { ...palavra, ...dados };
  }

  async apagar(usuarioId: number, listaId: number, id: number): Promise<void> {
    await this.#encontrarNaLista(usuarioId, listaId, id);
    await this.#palavras.apagar(id);
  }

  protected override buscarPorId(id: number): Promise<PalavraDaLista | null> {
    return this.#palavras.buscar(id);
  }

  protected override donoDe(palavra: PalavraDaLista): number {
    return palavra.listaId;
  }

  // Uma palavra de outra lista, para quem pediu por esta, simplesmente não existe aqui.
  protected override erroDeOutroDono(): ErroAplicacao {
    return new ErroNaoEncontrado(this.naoEncontrado);
  }

  async #encontrarNaLista(usuarioId: number, listaId: number, id: number): Promise<PalavraDaLista> {
    await this.#listas.buscar(usuarioId, listaId);
    return this.encontrarDoDono(listaId, id);
  }
}
