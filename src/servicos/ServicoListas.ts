import type { Lista } from "../dominio/Lista.js";
import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import { ErroProibido, type ErroAplicacao } from "../erros/ErroAplicacao.js";
import type { DadosLista } from "../esquemas/lista.js";
import type { RepositorioListas } from "../repositorios/RepositorioListas.js";
import { ServicoComDono } from "./ServicoComDono.js";

export class ServicoListas extends ServicoComDono<Lista> {
  protected override readonly naoEncontrado = "Lista não encontrada.";
  readonly #listas: RepositorioListas;

  constructor(listas: RepositorioListas) {
    super();
    this.#listas = listas;
  }

  listar(usuarioId: number, pedido: PedidoDePagina): Promise<Pagina<Lista>> {
    return this.#listas.listar(usuarioId, pedido);
  }

  buscar(usuarioId: number, id: number): Promise<Lista> {
    return this.encontrarDoDono(usuarioId, id);
  }

  criar(usuarioId: number, dados: DadosLista): Promise<Lista> {
    return this.#listas.criar(usuarioId, dados);
  }

  async editar(usuarioId: number, id: number, dados: DadosLista): Promise<Lista> {
    const lista = await this.encontrarDoDono(usuarioId, id);
    await this.#listas.atualizar(id, dados);
    return { ...lista, ...dados };
  }

  async apagar(usuarioId: number, id: number): Promise<void> {
    await this.encontrarDoDono(usuarioId, id);
    await this.#listas.apagar(id);
  }

  protected override buscarPorId(id: number): Promise<Lista | null> {
    return this.#listas.buscar(id);
  }

  protected override donoDe(lista: Lista): number {
    return lista.usuarioId;
  }

  protected override erroDeOutroDono(): ErroAplicacao {
    return new ErroProibido("Essa lista é de outra pessoa.");
  }
}
