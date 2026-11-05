import { describe, expect, it } from "vitest";
import { deslocamento, montarPagina } from "../../src/dominio/Pagina.js";
import { esquemaPaginacao } from "../../src/esquemas/paginacao.js";

describe("esquemaPaginacao", () => {
  it("usa a página 1 com 10 itens quando nada é pedido", () => {
    expect(esquemaPaginacao.parse({})).toEqual({ pagina: 1, porPagina: 10 });
  });

  it("lê os números que chegam como texto na URL", () => {
    expect(esquemaPaginacao.parse({ pagina: "3", porPagina: "20" })).toEqual({ pagina: 3, porPagina: 20 });
  });

  it.each([
    ["página zero", { pagina: "0" }, "pagina"],
    ["página que não é número", { pagina: "abc" }, "pagina"],
    ["página quebrada", { pagina: "1.5" }, "pagina"],
    ["página repetida na URL", { pagina: ["1", "2"] }, "pagina"],
    ["itens demais por página", { porPagina: "51" }, "porPagina"],
    ["zero itens por página", { porPagina: "0" }, "porPagina"],
  ])("recusa %s", (_caso, consulta, campo) => {
    const resultado = esquemaPaginacao.safeParse(consulta);

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual([campo]);
  });
});

describe("montarPagina", () => {
  it("calcula quantas páginas existem", () => {
    expect(montarPagina(["a", "b"], 12, { pagina: 2, porPagina: 5 })).toEqual({
      itens: ["a", "b"],
      pagina: 2,
      porPagina: 5,
      total: 12,
      totalDePaginas: 3,
    });
  });

  it("diz que há zero páginas quando não há nada", () => {
    expect(montarPagina([], 0, { pagina: 1, porPagina: 10 }).totalDePaginas).toBe(0);
  });

  it("pula os itens das páginas anteriores", () => {
    expect(deslocamento({ pagina: 1, porPagina: 10 })).toBe(0);
    expect(deslocamento({ pagina: 3, porPagina: 10 })).toBe(20);
  });
});
