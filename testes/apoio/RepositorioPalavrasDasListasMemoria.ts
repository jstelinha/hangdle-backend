import type { Pagina, PedidoDePagina } from "../../src/dominio/Pagina.js";
import type { PalavraDaLista } from "../../src/dominio/PalavraDaLista.js";
import type { DadosPalavra } from "../../src/esquemas/palavraDaLista.js";
import { erroPalavraRepetida, type RepositorioPalavrasDasListas } from "../../src/repositorios/RepositorioPalavrasDasListas.js";
import { mesmoTexto, paginarEmMemoria } from "./paginarEmMemoria.js";

export class RepositorioPalavrasDasListasMemoria implements RepositorioPalavrasDasListas {
  readonly #palavras = new Map<number, PalavraDaLista>();
  #proximoId = 1;

  async listar(listaId: number, pedido: PedidoDePagina): Promise<Pagina<PalavraDaLista>> {
    return paginarEmMemoria(
      this.#daLista(listaId).sort((a, b) => a.palavra.localeCompare(b.palavra, "pt-BR") || a.id - b.id),
      pedido,
    );
  }

  async buscar(id: number): Promise<PalavraDaLista | null> {
    return this.#palavras.get(id) ?? null;
  }

  async criar(listaId: number, dados: DadosPalavra): Promise<PalavraDaLista> {
    this.#recusarRepetida(listaId, dados.palavra);
    const palavra = { id: this.#proximoId++, listaId, ...dados };
    this.#palavras.set(palavra.id, palavra);
    return palavra;
  }

  async atualizar(id: number, dados: DadosPalavra): Promise<void> {
    const palavra = this.#palavras.get(id);
    if (palavra) {
      this.#recusarRepetida(palavra.listaId, dados.palavra, id);
      this.#palavras.set(id, { ...palavra, ...dados });
    }
  }

  async apagar(id: number): Promise<void> {
    this.#palavras.delete(id);
  }

  contar(listaId: number): number {
    return this.#daLista(listaId).length;
  }

  todasDaLista(listaId: number): PalavraDaLista[] {
    return this.#daLista(listaId);
  }

  #daLista(listaId: number): PalavraDaLista[] {
    return [...this.#palavras.values()].filter((palavra) => palavra.listaId === listaId);
  }

  #recusarRepetida(listaId: number, texto: string, ignorarId?: number): void {
    if (this.#daLista(listaId).some((palavra) => palavra.id !== ignorarId && mesmoTexto(palavra.palavra, texto))) {
      throw erroPalavraRepetida();
    }
  }
}
