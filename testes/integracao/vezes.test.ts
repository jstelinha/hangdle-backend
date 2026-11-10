import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

const COMECO = "2026-11-10 15:00:00.000";

let conexao: Connection;
let salaId: number;
let lari: number;
let bru: number;

type ValoresVez = {
  numero?: number;
  rodada?: number;
  escolhedorId?: number;
  palavra?: string | null;
  escolhidaEm?: string | null;
  terminouEm?: string | null;
};

async function inserirVez(valores: ValoresVez = {}): Promise<number> {
  const palavra = valores.palavra === undefined ? "ARARA" : valores.palavra;
  const escolhidaEm = valores.escolhidaEm === undefined ? (palavra === null ? null : COMECO) : valores.escolhidaEm;
  const [resultado] = await conexao.execute<ResultSetHeader>(
    `INSERT INTO vezes (sala_id, numero, rodada, escolhedor_id, palavra, comeca_em, escolhida_em, terminou_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [salaId, valores.numero ?? 1, valores.rodada ?? 1, valores.escolhedorId ?? lari, palavra, COMECO, escolhidaEm, valores.terminouEm ?? null],
  );
  return resultado.insertId;
}

function chutar(vezId: number, participanteId: number, letra: string) {
  return conexao.execute("INSERT INTO letras_chutadas (vez_id, participante_id, letra) VALUES (?, ?, ?)", [vezId, participanteId, letra]);
}

async function contar(tabela: "vezes" | "letras_chutadas"): Promise<number> {
  const [linhas] = await conexao.query<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM ${tabela}`);
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
  const larissa = await inserirUsuario(conexao);
  const bruna = await inserirUsuario(conexao, "bruna.teste@exemplo.com", "11144477735");
  const [sala] = await conexao.execute<ResultSetHeader>(
    "INSERT INTO salas (dono_id, nome, situacao) VALUES (?, 'Sala da Larissa', 'jogando')",
    [larissa],
  );
  salaId = sala.insertId;
  const [primeira] = await conexao.execute<ResultSetHeader>(
    "INSERT INTO participantes (sala_id, usuario_id, apelido) VALUES (?, ?, 'Lari')",
    [salaId, larissa],
  );
  const [segunda] = await conexao.execute<ResultSetHeader>(
    "INSERT INTO participantes (sala_id, usuario_id, apelido) VALUES (?, ?, 'Bru')",
    [salaId, bruna],
  );
  lari = primeira.insertId;
  bru = segunda.insertId;
});

afterEach(async () => {
  await conexao.rollback();
});

describe("travas das vezes", () => {
  it("aceita a vez esperando a palavra e a vez com a palavra escolhida", async () => {
    await expect(inserirVez({ palavra: null })).resolves.toBeGreaterThan(0);
    await expect(inserirVez({ numero: 2, palavra: "PÃO DE QUEIJO" })).resolves.toBeGreaterThan(0);
  });

  it.each([
    ["o mesmo número na sala", { numero: 1 }, /uq_vezes_sala_numero/],
    ["rodada fora de 1 a 5", { numero: 2, rodada: 6 }, /ck_vezes_rodada/],
    ["palavra em minúsculas", { numero: 2, palavra: "arara" }, /ck_vezes_palavra/],
    ["palavra com número", { numero: 2, palavra: "ARARA1" }, /ck_vezes_palavra/],
    ["palavra curta", { numero: 2, palavra: "AR" }, /ck_vezes_palavra/],
    ["palavra sem a hora da escolha", { numero: 2, escolhidaEm: null }, /ck_vezes_escolhida/],
    ["hora da escolha sem palavra", { numero: 2, palavra: null, escolhidaEm: COMECO }, /ck_vezes_escolhida/],
    ["vez terminada sem palavra", { numero: 2, palavra: null, terminouEm: COMECO }, /ck_vezes_terminou/],
    ["escolhedor que não está na sala", { numero: 2, escolhedorId: 999_999 }, /fk_vezes_escolhedor/],
  ])("recusa %s", async (_caso, valores, motivo) => {
    await inserirVez();

    await expect(inserirVez(valores)).rejects.toThrow(motivo);
  });

  it("apaga a vez, e as letras dela, quando quem escolheu sai da sala", async () => {
    const vezId = await inserirVez({ escolhedorId: bru });
    await chutar(vezId, lari, "A");

    await conexao.execute("DELETE FROM participantes WHERE id = ?", [bru]);

    expect(await contar("vezes")).toBe(0);
    expect(await contar("letras_chutadas")).toBe(0);
  });

  it("apaga as vezes junto com a sala", async () => {
    await inserirVez();

    await conexao.execute("DELETE FROM salas WHERE id = ?", [salaId]);

    expect(await contar("vezes")).toBe(0);
  });
});

describe("travas das letras chutadas", () => {
  it("recusa a mesma letra duas vezes para a mesma pessoa, mas aceita para outra", async () => {
    const vezId = await inserirVez();
    await chutar(vezId, bru, "A");

    await expect(chutar(vezId, bru, "A")).rejects.toThrow(/uq_letras_chutadas_vez_participante_letra/);
    await expect(chutar(vezId, lari, "A")).resolves.toBeDefined();
  });

  it.each([["minúscula", "a"], ["número", "1"]])("recusa %s", async (_caso, letra) => {
    const vezId = await inserirVez();

    await expect(chutar(vezId, bru, letra)).rejects.toThrow(/ck_letras_chutadas_letra/);
  });

  it("recusa letra com acento, porque a coluna só guarda ASCII", async () => {
    const vezId = await inserirVez();

    await expect(chutar(vezId, bru, "Ç")).rejects.toThrow(/ascii/);
  });

  it("apaga as letras de quem sai da sala", async () => {
    const vezId = await inserirVez();
    await chutar(vezId, bru, "A");

    await conexao.execute("DELETE FROM participantes WHERE id = ?", [bru]);

    expect(await contar("letras_chutadas")).toBe(0);
  });
});
