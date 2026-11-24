import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

let conexao: Connection;
let larissa: number;
let bruna: number;
let frutas: number;

async function inserirLista(nome: string, usuarioId = larissa): Promise<number> {
  const [resultado] = await conexao.execute<ResultSetHeader>("INSERT INTO listas (usuario_id, nome) VALUES (?, ?)", [usuarioId, nome]);
  return resultado.insertId;
}

function inserirPalavra(texto: string, valores: { listaId?: number; dica?: string | null } = {}) {
  return conexao.execute("INSERT INTO palavras_das_listas (lista_id, texto, dica) VALUES (?, ?, ?)", [
    valores.listaId ?? frutas,
    texto,
    valores.dica ?? null,
  ]);
}

async function contarPalavras(): Promise<number> {
  const [linhas] = await conexao.query<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) AS total FROM palavras_das_listas");
  return Number(linhas[0]?.total);
}

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
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
  frutas = await inserirLista("Frutas");
});

afterEach(async () => {
  await conexao.rollback();
});

describe("travas das listas", () => {
  it("recusa duas listas com o mesmo nome para a mesma pessoa", async () => {
    await expect(inserirLista("frutas")).rejects.toThrow(/uq_listas_usuario_nome/);
  });

  it("deixa outra pessoa ter uma lista com o mesmo nome", async () => {
    await expect(inserirLista("Frutas", bruna)).resolves.toBeGreaterThan(0);
  });

  it("recusa lista de quem não existe", async () => {
    await expect(inserirLista("Bichos", 999_999)).rejects.toThrow(/fk_listas_usuario/);
  });

  it("recusa nome com menos de 2 letras", async () => {
    await expect(inserirLista(" A ")).rejects.toThrow(/ck_listas_nome/);
  });
});

describe("travas das palavras das listas", () => {
  it.each(["MAÇÃ", "PÃO DE QUEIJO", "GUARDA-CHUVA"])("aceita %s", async (texto) => {
    await expect(inserirPalavra(texto)).resolves.toBeDefined();
  });

  it.each([
    ["minúscula", "maçã"],
    ["número", "PAO2"],
    ["menos de 3 letras", "PÉ"],
  ])("recusa palavra com %s", async (_caso, texto) => {
    await expect(inserirPalavra(texto)).rejects.toThrow(/ck_palavras_das_listas/);
  });

  it("recusa a mesma palavra duas vezes na lista, mesmo sem os acentos", async () => {
    await inserirPalavra("MAÇÃ");

    await expect(inserirPalavra("MACA")).rejects.toThrow(/uq_palavras_das_listas_texto/);
  });

  it("deixa a mesma palavra em listas diferentes", async () => {
    const comidas = await inserirLista("Comidas");
    await inserirPalavra("MAÇÃ");

    await expect(inserirPalavra("MAÇÃ", { listaId: comidas })).resolves.toBeDefined();
  });

  it("recusa dica vazia, mas aceita palavra sem dica", async () => {
    await expect(inserirPalavra("UVA", { dica: "  " })).rejects.toThrow(/ck_palavras_das_listas_dica/);
    await expect(inserirPalavra("UVA", { dica: null })).resolves.toBeDefined();
  });

  it("recusa palavra de uma lista que não existe", async () => {
    await expect(inserirPalavra("MAÇÃ", { listaId: 999_999 })).rejects.toThrow(/fk_palavras_das_listas_lista/);
  });

  it("apaga as palavras junto com a lista", async () => {
    await inserirPalavra("MAÇÃ");
    await inserirPalavra("UVA");

    await conexao.execute("DELETE FROM listas WHERE id = ?", [frutas]);

    expect(await contarPalavras()).toBe(0);
  });
});
