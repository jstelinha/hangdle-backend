import type { Lista } from "../../src/dominio/Lista.js";
import type { Pagina, PedidoDePagina } from "../../src/dominio/Pagina.js";
import type { DadosLista } from "../../src/esquemas/lista.js";
import { erroListaRepetida, type RepositorioListas } from "../../src/repositorios/RepositorioListas.js";
import { mesmoTexto, paginarEmMemoria } from "./paginarEmMemoria.js";

export class RepositorioListasMemoria implements RepositorioListas {
  readonly #listas = new Map<number, Lista>();
  readonly #contarPalavras: (listaId: number) => number;
  #proximoId = 1;

  constructor(contarPalavras: (listaId: number) => number = () => 0) {
    this.#contarPalavras = contarPalavras;
  }

  async listar(usuarioId: number, pedido: PedidoDePagina): Promise<Pagina<Lista>> {
    const daPessoa = [...this.#listas.values()]
      .filter((lista) => lista.usuarioId === usuarioId)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id - b.id)
      .map((lista) => this.#comContagem(lista));
    return paginarEmMemoria(daPessoa, pedido);
  }

  async buscar(id: number): Promise<Lista | null> {
    const lista = this.#listas.get(id);
    return lista ? this.#comContagem(lista) : null;
  }

  async criar(usuarioId: number, { nome }: DadosLista): Promise<Lista> {
    this.#recusarRepetida(usuarioId, nome);
    const lista = { id: this.#proximoId++, usuarioId, nome, totalDePalavras: 0 };
    this.#listas.set(lista.id, lista);
    return lista;
  }

  async atualizar(id: number, { nome }: DadosLista): Promise<void> {
    const lista = this.#listas.get(id);
    if (lista) {
      this.#recusarRepetida(lista.usuarioId, nome, id);
      this.#listas.set(id, { ...lista, nome });
    }
  }

  async apagar(id: number): Promise<void> {
    this.#listas.delete(id);
  }

  #comContagem(lista: Lista): Lista {
    return { ...lista, totalDePalavras: this.#contarPalavras(lista.id) };
  }

  #recusarRepetida(usuarioId: number, nome: string, ignorarId?: number): void {
    const repetida = [...this.#listas.values()].some(
      (lista) => lista.usuarioId === usuarioId && lista.id !== ignorarId && mesmoTexto(lista.nome, nome),
    );
    if (repetida) {
      throw erroListaRepetida();
    }
  }
}
