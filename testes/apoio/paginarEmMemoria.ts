import { deslocamento, montarPagina, type Pagina, type PedidoDePagina } from "../../src/dominio/Pagina.js";

export function paginarEmMemoria<T>(todos: readonly T[], pedido: PedidoDePagina): Pagina<T> {
  const inicio = deslocamento(pedido);
  return montarPagina(todos.slice(inicio, inicio + pedido.porPagina), todos.length, pedido);
}

// Imita a collation do MySQL: maiúsculas, minúsculas e acentos contam como iguais.
export function mesmoTexto(a: string, b: string): boolean {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;
}
