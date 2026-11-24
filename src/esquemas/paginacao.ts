import { z } from "zod";

export const POR_PAGINA_PADRAO = 10;
export const POR_PAGINA_MAXIMO = 50;
const PAGINA_MAXIMA = 10_000;

const PAGINA_INVALIDA = "A página precisa ser um número inteiro a partir de 1.";
const POR_PAGINA_INVALIDO = `Peça de 1 a ${POR_PAGINA_MAXIMO} itens por página.`;

function inteiroPositivo(mensagem: string) {
  return z.coerce.number({ error: mensagem }).int(mensagem).positive(mensagem);
}

// Rubrica de Back-end - Cruds Completos - Paginação das listagens
export const esquemaPaginacao = z.object({
  pagina: inteiroPositivo(PAGINA_INVALIDA).max(PAGINA_MAXIMA, PAGINA_INVALIDA).default(1),
  porPagina: inteiroPositivo(POR_PAGINA_INVALIDO).max(POR_PAGINA_MAXIMO, POR_PAGINA_INVALIDO).default(POR_PAGINA_PADRAO),
});
