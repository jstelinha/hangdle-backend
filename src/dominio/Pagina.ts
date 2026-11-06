export type PedidoDePagina = {
  pagina: number;
  porPagina: number;
};

// Rubrica de Tech Forge - Tipagem Avançada e Recursos do TypeScript - Generics para reaproveitar código tipado
export type Pagina<T> = {
  itens: T[];
  pagina: number;
  porPagina: number;
  total: number;
  totalDePaginas: number;
};

export function deslocamento({ pagina, porPagina }: PedidoDePagina): number {
  return (pagina - 1) * porPagina;
}

export function montarPagina<T>(itens: T[], total: number, { pagina, porPagina }: PedidoDePagina): Pagina<T> {
  return { itens, pagina, porPagina, total, totalDePaginas: Math.ceil(total / porPagina) };
}
