import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";

let conexao: Connection;
let comida: number;

async function inserirCategoria(nome: string): Promise<number> {
  const [resultado] = await conexao.execute<ResultSetHeader>("INSERT INTO categorias (nome) VALUES (?)", [nome]);
  return resultado.insertId;
}

function inserirPalavra(texto: string, categoriaId = comida) {
  return conexao.execute("INSERT INTO palavras (texto, categoria_id) VALUES (?, ?)", [texto, categoriaId]);
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
  comida = await inserirCategoria("Comida");
});

afterEach(async () => {
  await conexao.rollback();
});

describe("travas das palavras e categorias", () => {
  it.each(["MAÇÃ", "PÃO DE QUEIJO", "GUARDA-CHUVA"])("aceita %s", async (texto) => {
    await expect(inserirPalavra(texto)).resolves.toBeDefined();
  });

  it("guarda os acentos sem trocar os caracteres", async () => {
    await inserirPalavra("MAÇÃ");

    const [linhas] = await conexao.query<(RowDataPacket & { texto: string })[]>("SELECT texto FROM palavras");

    expect(linhas[0]?.texto).toBe("MAÇÃ");
  });

  it.each([
    ["minúscula", "maçã"],
    ["número", "PAO2"],
    ["espaço sobrando", "PÃO  DE QUEIJO"],
    ["menos de 3 letras", "PÉ"],
  ])("recusa palavra com %s", async (_caso, texto) => {
    await expect(inserirPalavra(texto)).rejects.toThrow(/ck_palavras/);
  });

  it("recusa palavra repetida, mesmo sem os acentos", async () => {
    await inserirPalavra("MAÇÃ");

    await expect(inserirPalavra("MACA")).rejects.toThrow(/uq_palavras_texto/);
  });

  it("recusa palavra de uma categoria que não existe", async () => {
    await expect(inserirPalavra("MAÇÃ", 999_999)).rejects.toThrow(/fk_palavras_categoria/);
  });

  it("não apaga uma categoria que ainda tem palavras", async () => {
    await inserirPalavra("MAÇÃ");

    await expect(conexao.execute("DELETE FROM categorias WHERE id = ?", [comida])).rejects.toThrow(/fk_palavras_categoria/);
  });

  it("recusa categoria repetida", async () => {
    await expect(inserirCategoria("comida")).rejects.toThrow(/uq_categorias_nome/);
  });
});
