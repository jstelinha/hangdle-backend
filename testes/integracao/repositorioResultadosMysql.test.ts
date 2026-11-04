import type { Connection } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ResultadoDiario } from "../../src/dominio/ResultadoDiario.js";
import { ErroConflito } from "../../src/erros/ErroAplicacao.js";
import { RepositorioResultadosMysql } from "../../src/repositorios/RepositorioResultadosMysql.js";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirPalavraDoDia, inserirUsuario } from "../apoio/dadosDoJogo.js";

let conexao: Connection;
let repositorio: RepositorioResultadosMysql;
let larissa: number;
let bruna: number;

const MACA: ResultadoDiario = {
  dia: "2026-11-03",
  palavra: "MAÇÃ",
  categoria: "Comida",
  letras: ["Z", "M", "A", "C"],
  chutes: 4,
  erros: 1,
  acertou: true,
};

const ABACAXI: ResultadoDiario = {
  dia: "2026-11-04",
  palavra: "ABACAXI",
  categoria: "Comida",
  letras: [..."ZWYKLM"],
  chutes: 6,
  erros: 6,
  acertou: false,
};

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
  repositorio = new RepositorioResultadosMysql(conexao);
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
  await inserirPalavraDoDia(conexao, "2026-11-03", "MAÇÃ");
  await inserirPalavraDoDia(conexao, "2026-11-04", "ABACAXI");
});

afterEach(async () => {
  await conexao.rollback();
});

describe("resultados no MySQL", () => {
  it("salva e lista com a palavra e a categoria, do mais novo para o mais antigo", async () => {
    await repositorio.salvar(larissa, MACA);
    await repositorio.salvar(larissa, ABACAXI);

    expect(await repositorio.listar(larissa)).toEqual([ABACAXI, MACA]);
  });

  it("filtra por dia e por pessoa", async () => {
    await repositorio.salvar(larissa, MACA);
    await repositorio.salvar(larissa, ABACAXI);

    expect(await repositorio.listar(larissa, "2026-11-03")).toEqual([MACA]);
    expect(await repositorio.listar(bruna)).toEqual([]);
  });

  it("traduz o resultado repetido recusado pelo banco", async () => {
    await repositorio.salvar(larissa, MACA);

    await expect(repositorio.salvar(larissa, MACA)).rejects.toBeInstanceOf(ErroConflito);
  });
});
