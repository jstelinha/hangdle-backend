import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";

// O "dono" é quem agrupa os recursos: a pessoa, para as listas e as salas; a lista, para as palavras; a sala, para os participantes.
// Rubrica de Tech Forge - Tipagem Avançada e Recursos do TypeScript - Interface genérica para os repositórios dos CRUDs
export interface RepositorioDeRecursos<Recurso, DadosNovos, DadosEditados = DadosNovos> {
  listar(donoId: number, pedido: PedidoDePagina): Promise<Pagina<Recurso>>;
  buscar(id: number): Promise<Recurso | null>;
  criar(donoId: number, dados: DadosNovos): Promise<Recurso>;
  atualizar(id: number, dados: DadosEditados): Promise<void>;
  apagar(id: number): Promise<void>;
}
