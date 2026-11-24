import type { ListaPronta, ListaProntaComPalavras } from "../dominio/ListaPronta.js";

// Só leitura: as listas prontas nascem do mysql/10-listas-prontas.sql, e a API nunca as muda.
export interface RepositorioListasProntas {
  listar(): Promise<ListaPronta[]>;
  buscarComPalavras(id: number): Promise<ListaProntaComPalavras | null>;
}
