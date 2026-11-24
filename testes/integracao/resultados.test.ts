import type { Connection, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirPalavraDoDia, inserirUsuario } from "../apoio/dadosDoJogo.js";

let conexao: Connection;
let usuarioId: number;

function inserirResultado(valores: { dia?: string; letras?: string; erros?: number; acertou?: boolean } = {}) {
  return conexao.execute("INSERT INTO resultados_diarios (usuario_id, dia, letras, erros, acertou) VALUES (?, ?, ?, ?, ?)", [
    usuarioId,
    valores.dia ?? "2026-11-03",
    valores.letras ?? "ZMAC",
    valores.erros ?? 1,
    valores.acertou ?? true,
  ]);
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
  usuarioId = await inserirUsuario(conexao);
  await inserirPalavraDoDia(conexao, "2026-11-03");
});

afterEach(async () => {
  await conexao.rollback();
});

describe("travas dos resultados do dia", () => {
  it("calcula sozinho em quantas letras a pessoa jogou", async () => {
    await inserirResultado({ letras: "ZMAC" });

    const [linhas] = await conexao.query<(RowDataPacket & { chutes: number })[]>("SELECT chutes FROM resultados_diarios");

    expect(linhas[0]?.chutes).toBe(4);
  });

  it("recusa um segundo resultado da mesma pessoa no mesmo dia", async () => {
    await inserirResultado();

    await expect(inserirResultado()).rejects.toThrow(/uq_resultados_usuario_dia/);
  });

  it("recusa resultado de um dia que não teve palavra", async () => {
    await expect(inserirResultado({ dia: "2026-11-02" })).rejects.toThrow(/fk_resultados_dia/);
  });

  it.each([
    ["letra minúscula", { letras: "zmac" }, /ck_resultados_letras/],
    ["algo que não é letra", { letras: "ZM4C" }, /ck_resultados_letras/],
    ["mais de 6 erros", { erros: 7 }, /ck_resultados_erros/],
  ])("recusa %s", async (_caso, valores, motivo) => {
    await expect(inserirResultado(valores)).rejects.toThrow(motivo);
  });
});
