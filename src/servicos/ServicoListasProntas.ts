import type { Lista } from "../dominio/Lista.js";
import type { ListaPronta } from "../dominio/ListaPronta.js";
import { ErroNaoEncontrado } from "../erros/ErroAplicacao.js";
import type { RepositorioListas } from "../repositorios/RepositorioListas.js";
import type { RepositorioListasProntas } from "../repositorios/RepositorioListasProntas.js";
import type { RepositorioPalavrasDasListas } from "../repositorios/RepositorioPalavrasDasListas.js";

export class ServicoListasProntas {
  readonly #prontas: RepositorioListasProntas;
  readonly #listas: RepositorioListas;
  readonly #palavras: RepositorioPalavrasDasListas;

  constructor(prontas: RepositorioListasProntas, listas: RepositorioListas, palavras: RepositorioPalavrasDasListas) {
    this.#prontas = prontas;
    this.#listas = listas;
    this.#palavras = palavras;
  }

  listar(): Promise<ListaPronta[]> {
    return this.#prontas.listar();
  }

  // A cópia é uma lista comum da pessoa, com o nome e as palavras do modelo. Se ela já tem uma lista com esse nome, o
  // repositório recusa (409). Se uma palavra não entrar no meio do caminho, a lista criada sai: não fica pela metade.
  async copiar(usuarioId: number, id: number): Promise<Lista> {
    const pronta = await this.#prontas.buscarComPalavras(id);
    if (!pronta) {
      throw new ErroNaoEncontrado("Lista pronta não encontrada.");
    }
    const lista = await this.#listas.criar(usuarioId, { nome: pronta.nome });
    try {
      for (const { palavra, dica } of pronta.palavras) {
        await this.#palavras.criar(lista.id, { palavra, dica });
      }
    } catch (erro) {
      await this.#listas.apagar(lista.id);
      throw erro;
    }
    return { ...lista, totalDePalavras: pronta.palavras.length };
  }
}
