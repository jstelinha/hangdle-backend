import type { ListaPronta, ListaProntaComPalavras } from "../../src/dominio/ListaPronta.js";
import type { RepositorioListasProntas } from "../../src/repositorios/RepositorioListasProntas.js";

export const LISTAS_PRONTAS_TESTE: ListaProntaComPalavras[] = [
  {
    id: 1,
    nome: "Animais",
    totalDePalavras: 3,
    palavras: [
      { palavra: "ARARA", dica: "Ave colorida de bico forte" },
      { palavra: "CAPIVARA", dica: "Maior roedor do mundo" },
      { palavra: "LOBO-GUARÁ", dica: null },
    ],
  },
  {
    id: 2,
    nome: "Frutas",
    totalDePalavras: 2,
    palavras: [
      { palavra: "CAJU", dica: "A castanha fica do lado de fora" },
      { palavra: "FRUTA-DO-CONDE", dica: null },
    ],
  },
];

export class RepositorioListasProntasMemoria implements RepositorioListasProntas {
  readonly #listas: ListaProntaComPalavras[];

  constructor(listas: ListaProntaComPalavras[] = LISTAS_PRONTAS_TESTE) {
    this.#listas = listas;
  }

  async listar(): Promise<ListaPronta[]> {
    return [...this.#listas]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id - b.id)
      .map(({ id, nome, totalDePalavras }) => ({ id, nome, totalDePalavras }));
  }

  async buscarComPalavras(id: number): Promise<ListaProntaComPalavras | null> {
    return this.#listas.find((lista) => lista.id === id) ?? null;
  }
}
