import type { Connection } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErroConflito } from "../../src/erros/ErroAplicacao.js";
import { RepositorioListasMysql } from "../../src/repositorios/RepositorioListasMysql.js";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

let conexao: Connection;
let repositorio: RepositorioListasMysql;
let larissa: number;
let bruna: number;

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
  repositorio = new RepositorioListasMysql(conexao);
});

afterAll(async () => {
  await conexao.end();
});

beforeEach(async () => {
  await conexao.beginTransaction();
  await esvaziarTabelasDoJogo(conexao);
  await conexao.query("DELETE FROM usuarios");
  larissa = await inserirUsuario(conexao);
  bruna = await inserirUsuario(conexao, "bruna.teste@exemplo.com", "11144477735");
});

afterEach(async () => {
  await conexao.rollback();
});

describe("listas no MySQL", () => {
  it("cria e busca a lista com quantas palavras ela tem", async () => {
    const criada = await repositorio.criar(larissa, { nome: "Frutas" });
    await conexao.execute("INSERT INTO palavras_das_listas (lista_id, texto) VALUES (?, 'MAÇÃ'), (?, 'UVA')", [criada.id, criada.id]);

    expect(criada).toEqual({ id: expect.any(Number), usuarioId: larissa, nome: "Frutas", totalDePalavras: 0 });
    expect(await repositorio.buscar(criada.id)).toEqual({ ...criada, totalDePalavras: 2 });
  });

  it("lista só as da pessoa, em ordem alfabética e em páginas", async () => {
    for (const nome of ["Países", "Animais", "Frutas"]) {
      await repositorio.criar(larissa, { nome });
    }
    await repositorio.criar(bruna, { nome: "Cores" });

    const primeira = await repositorio.listar(larissa, { pagina: 1, porPagina: 2 });
    const segunda = await repositorio.listar(larissa, { pagina: 2, porPagina: 2 });

    expect(primeira.itens.map((lista) => lista.nome)).toEqual(["Animais", "Frutas"]);
    expect(primeira).toMatchObject({ total: 3, totalDePaginas: 2 });
    expect(segunda.itens.map((lista) => lista.nome)).toEqual(["Países"]);
  });

  it("devolve uma página vazia depois da última", async () => {
    await repositorio.criar(larissa, { nome: "Frutas" });

    const pagina = await repositorio.listar(larissa, { pagina: 5, porPagina: 10 });

    expect(pagina).toEqual({ itens: [], pagina: 5, porPagina: 10, total: 1, totalDePaginas: 1 });
  });

  it("troca o nome e apaga", async () => {
    const lista = await repositorio.criar(larissa, { nome: "Frutas" });

    await repositorio.atualizar(lista.id, { nome: "Frutas do Brasil" });
    expect((await repositorio.buscar(lista.id))?.nome).toBe("Frutas do Brasil");

    await repositorio.apagar(lista.id);
    expect(await repositorio.buscar(lista.id)).toBeNull();
  });

  it("traduz o nome repetido recusado pelo banco, ao criar e ao editar", async () => {
    const frutas = await repositorio.criar(larissa, { nome: "Frutas" });
    await repositorio.criar(larissa, { nome: "Animais" });

    await expect(repositorio.criar(larissa, { nome: "frutas" })).rejects.toBeInstanceOf(ErroConflito);
    await expect(repositorio.atualizar(frutas.id, { nome: "Animais" })).rejects.toBeInstanceOf(ErroConflito);
  });
});
