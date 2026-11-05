import type { Lista } from "../../src/dominio/Lista.js";
import type { Pagina, PedidoDePagina } from "../../src/dominio/Pagina.js";
import type { DadosLista } from "../../src/esquemas/lista.js";
import { erroListaRepetida, type RepositorioListas } from "../../src/repositorios/RepositorioListas.js";
import { mesmoTexto, paginarEmMemoria } from "./paginarEmMemoria.js";

export class RepositorioListasMemoria implements RepositorioListas {
  readonly #listas = new Map<number, Lista>();
  #proximoId = 1;

  async listar(usuarioId: number, pedido: PedidoDePagina): Promise<Pagina<Lista>> {
    const daPessoa = [...this.#listas.values()]
      .filter((lista) => lista.usuarioId === usuarioId)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id - b.id);
    return paginarEmMemoria(daPessoa, pedido);
  }

  async buscar(id: number): Promise<Lista | null> {
    return this.#listas.get(id) ?? null;
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

  #recusarRepetida(usuarioId: number, nome: string, ignorarId?: number): void {
    const repetida = [...this.#listas.values()].some(
      (lista) => lista.usuarioId === usuarioId && lista.id !== ignorarId && mesmoTexto(lista.nome, nome),
    );
    if (repetida) {
      throw erroListaRepetida();
    }
  }
}
