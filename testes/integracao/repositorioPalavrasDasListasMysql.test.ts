import type { Connection, ResultSetHeader } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErroConflito } from "../../src/erros/ErroAplicacao.js";
import { RepositorioPalavrasDasListasMysql } from "../../src/repositorios/RepositorioPalavrasDasListasMysql.js";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

let conexao: Connection;
let repositorio: RepositorioPalavrasDasListasMysql;
let frutas: number;
let comidas: number;

async function inserirLista(usuarioId: number, nome: string): Promise<number> {
  const [resultado] = await conexao.execute<ResultSetHeader>("INSERT INTO listas (usuario_id, nome) VALUES (?, ?)", [usuarioId, nome]);
  return resultado.insertId;
}

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
  repositorio = new RepositorioPalavrasDasListasMysql(conexao);
});

afterAll(async () => {
  await conexao.end();
});

beforeEach(async () => {
  await conexao.beginTransaction();
  await esvaziarTabelasDoJogo(conexao);
  await conexao.query("DELETE FROM usuarios");
  const larissa = await inserirUsuario(conexao);
  frutas = await inserirLista(larissa, "Frutas");
  comidas = await inserirLista(larissa, "Comidas");
});

afterEach(async () => {
  await conexao.rollback();
});

describe("palavras das listas no MySQL", () => {
  it("cria e busca com os acentos e a dica", async () => {
    const criada = await repositorio.criar(frutas, { palavra: "MAÇÃ", dica: "Vermelha ou verde" });

    expect(await repositorio.buscar(criada.id)).toEqual({ id: criada.id, listaId: frutas, palavra: "MAÇÃ", dica: "Vermelha ou verde" });
  });

  it("lista só as da lista, em ordem alfabética e em páginas", async () => {
    for (const palavra of ["UVA", "ABACAXI", "MAÇÃ"]) {
      await repositorio.criar(frutas, { palavra, dica: null });
    }
    await repositorio.criar(comidas, { palavra: "ARROZ", dica: null });

    const primeira = await repositorio.listar(frutas, { pagina: 1, porPagina: 2 });
    const segunda = await repositorio.listar(frutas, { pagina: 2, porPagina: 2 });

    expect(primeira.itens.map((item) => item.palavra)).toEqual(["ABACAXI", "MAÇÃ"]);
    expect(primeira).toMatchObject({ total: 3, totalDePaginas: 2 });
    expect(segunda.itens.map((item) => item.palavra)).toEqual(["UVA"]);
  });

  it("edita e apaga", async () => {
    const uva = await repositorio.criar(frutas, { palavra: "UVA", dica: null });

    await repositorio.atualizar(uva.id, { palavra: "UVA PASSA", dica: "Seca" });
    expect(await repositorio.buscar(uva.id)).toMatchObject({ palavra: "UVA PASSA", dica: "Seca" });

    await repositorio.apagar(uva.id);
    expect(await repositorio.buscar(uva.id)).toBeNull();
  });

  it("traduz a palavra repetida recusada pelo banco, ao criar e ao editar", async () => {
    const uva = await repositorio.criar(frutas, { palavra: "UVA", dica: null });
    await repositorio.criar(frutas, { palavra: "MAÇÃ", dica: null });

    await expect(repositorio.criar(frutas, { palavra: "MACA", dica: null })).rejects.toBeInstanceOf(ErroConflito);
    await expect(repositorio.atualizar(uva.id, { palavra: "MAÇÃ", dica: null })).rejects.toBeInstanceOf(ErroConflito);
  });
});
