import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";

// O "dono" é quem agrupa os recursos: a pessoa, para as listas; a lista, para as palavras.
// Rubrica de Tech Forge - Tipagem Avançada e Recursos do TypeScript - Interface genérica para os repositórios dos CRUDs
export interface RepositorioDeRecursos<Recurso, Dados> {
  listar(donoId: number, pedido: PedidoDePagina): Promise<Pagina<Recurso>>;
  buscar(id: number): Promise<Recurso | null>;
  criar(donoId: number, dados: Dados): Promise<Recurso>;
  atualizar(id: number, dados: Dados): Promise<void>;
  apagar(id: number): Promise<void>;
}
