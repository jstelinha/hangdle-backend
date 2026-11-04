import type { Connection, ResultSetHeader } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RepositorioPalavrasDoDiaMysql } from "../../src/repositorios/RepositorioPalavrasDoDiaMysql.js";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";

let conexao: Connection;
let repositorio: RepositorioPalavrasDoDiaMysql;

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
  repositorio = new RepositorioPalavrasDoDiaMysql(conexao);
});

afterAll(async () => {
  await conexao.end();
});

beforeEach(async () => {
  await conexao.beginTransaction();
  await esvaziarTabelasDoJogo(conexao);
  const [categoria] = await conexao.execute<ResultSetHeader>("INSERT INTO categorias (nome) VALUES ('Comida')");
  await conexao.execute("INSERT INTO palavras (texto, categoria_id) VALUES ('MAÇÃ', ?), ('ABACAXI', ?)", [
    categoria.insertId,
    categoria.insertId,
  ]);
});

afterEach(async () => {
  await conexao.rollback();
});

describe("palavra do dia no MySQL", () => {
  it("sorteia, guarda e devolve com a categoria", async () => {
    const sorteada = await repositorio.sortear("2026-11-03");

    expect(sorteada).toMatchObject({ dia: "2026-11-03", categoria: "Comida" });
    expect(["MAÇÃ", "ABACAXI"]).toContain(sorteada?.palavra);
    expect(await repositorio.buscar("2026-11-03")).toEqual(sorteada);
  });

  it("não sorteia de novo um dia que já tem palavra", async () => {
    const primeira = await repositorio.sortear("2026-11-03");
    const segunda = await repositorio.sortear("2026-11-03");

    expect(segunda).toEqual(primeira);
  });

  it("não repete enquanto houver palavra que nunca saiu", async () => {
    const hoje = await repositorio.sortear("2026-11-03");
    const amanha = await repositorio.sortear("2026-11-04");

    expect(amanha?.palavra).not.toBe(hoje?.palavra);
  });

  it("quando todas já saíram, volta a que saiu há mais tempo", async () => {
    const primeiro = await repositorio.sortear("2026-11-03");
    await repositorio.sortear("2026-11-04");
    const terceiro = await repositorio.sortear("2026-11-05");

    expect(terceiro?.palavra).toBe(primeiro?.palavra);
  });

  it("devolve nada quando o dia não tem palavra ou não há palavras", async () => {
    expect(await repositorio.buscar("2026-11-03")).toBeNull();

    await esvaziarTabelasDoJogo(conexao);

    expect(await repositorio.sortear("2026-11-03")).toBeNull();
  });
});
