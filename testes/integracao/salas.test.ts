import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

const HASH_DA_SALA = "$2b$10$abcdefghijklmnopqrstuuMRjZ7c0Y3x5r4H9Fh7wJxX2nXxXxXxX";

let conexao: Connection;
let larissa: number;
let bruna: number;
let carla: number;

type ValoresSala = {
  senhaHash?: string | null;
  listaId?: number | null;
  segundos?: number;
  rodadas?: number;
  maximo?: number;
  nome?: string;
};

async function inserirSala(valores: ValoresSala = {}): Promise<number> {
  const [resultado] = await conexao.execute<ResultSetHeader>(
    `INSERT INTO salas (dono_id, nome, senha_hash, lista_id, segundos_por_rodada, rodadas, maximo_de_jogadores)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      larissa,
      valores.nome ?? "Sala da Larissa",
      valores.senhaHash ?? null,
      valores.listaId ?? null,
      valores.segundos ?? 90,
      valores.rodadas ?? 2,
      valores.maximo ?? 6,
    ],
  );
  return resultado.insertId;
}

function inserirParticipante(salaId: number, usuarioId: number, apelido: string) {
  return conexao.execute("INSERT INTO participantes (sala_id, usuario_id, apelido) VALUES (?, ?, ?)", [salaId, usuarioId, apelido]);
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
  carla = await inserirUsuario(conexao, "carla.teste@exemplo.com", "39053344705");
});

afterEach(async () => {
  await conexao.rollback();
});

describe("travas das salas", () => {
  it("aceita sala pública e sala com senha", async () => {
    await expect(inserirSala()).resolves.toBeGreaterThan(0);
    await expect(inserirSala({ senhaHash: HASH_DA_SALA })).resolves.toBeGreaterThan(0);
  });

  it.each([
    ["tempo fora dos níveis", { segundos: 60 }, /ck_salas_segundos/],
    ["nenhuma rodada", { rodadas: 0 }, /ck_salas_rodadas/],
    ["rodadas demais", { rodadas: 6 }, /ck_salas_rodadas/],
    ["só 1 jogador", { maximo: 1 }, /ck_salas_maximo/],
    ["jogadores demais", { maximo: 11 }, /ck_salas_maximo/],
    ["senha sem criptografia", { senhaHash: "senha123" }, /ck_salas_senha_bcrypt/],
    ["nome curto", { nome: " A " }, /ck_salas_nome/],
    ["lista que não existe", { listaId: 999_999 }, /fk_salas_lista/],
  ])("recusa %s", async (_caso, valores, motivo) => {
    await expect(inserirSala(valores)).rejects.toThrow(motivo);
  });

  it("continua existindo, sem lista, quando a lista é apagada", async () => {
    const [lista] = await conexao.execute<ResultSetHeader>("INSERT INTO listas (usuario_id, nome) VALUES (?, 'Frutas')", [larissa]);
    const salaId = await inserirSala({ listaId: lista.insertId });

    await conexao.execute("DELETE FROM listas WHERE id = ?", [lista.insertId]);

    const [linhas] = await conexao.query<(RowDataPacket & { lista_id: number | null })[]>("SELECT lista_id FROM salas WHERE id = ?", [salaId]);
    expect(linhas[0]?.lista_id).toBeNull();
  });
});

describe("travas dos participantes", () => {
  it("recusa a mesma pessoa duas vezes na sala", async () => {
    const salaId = await inserirSala();
    await inserirParticipante(salaId, larissa, "Lari");

    await expect(inserirParticipante(salaId, larissa, "Outra")).rejects.toThrow(/uq_participantes_sala_usuario/);
  });

  it("recusa apelido repetido na mesma sala, mas aceita em outra", async () => {
    const salaId = await inserirSala();
    const outraSala = await inserirSala();
    await inserirParticipante(salaId, larissa, "Lari");

    await expect(inserirParticipante(salaId, bruna, "lari")).rejects.toThrow(/uq_participantes_sala_apelido/);
    await expect(inserirParticipante(outraSala, bruna, "Lari")).resolves.toBeDefined();
  });

  it("recusa quem chega com a sala cheia", async () => {
    const salaId = await inserirSala({ maximo: 2 });
    await inserirParticipante(salaId, larissa, "Lari");
    await inserirParticipante(salaId, bruna, "Bru");

    await expect(inserirParticipante(salaId, carla, "Carla")).rejects.toThrow(/Sala cheia/);
  });

  it("não deixa baixar o máximo para menos do que os jogadores que já estão na sala", async () => {
    const salaId = await inserirSala();
    await inserirParticipante(salaId, larissa, "Lari");
    await inserirParticipante(salaId, bruna, "Bru");
    await inserirParticipante(salaId, carla, "Carla");

    await expect(conexao.execute("UPDATE salas SET maximo_de_jogadores = 2 WHERE id = ?", [salaId])).rejects.toThrow(/mais jogadores/);
    await expect(conexao.execute("UPDATE salas SET maximo_de_jogadores = 3 WHERE id = ?", [salaId])).resolves.toBeDefined();
  });

  it("apaga os participantes junto com a sala", async () => {
    const salaId = await inserirSala();
    await inserirParticipante(salaId, larissa, "Lari");

    await conexao.execute("DELETE FROM salas WHERE id = ?", [salaId]);

    const [linhas] = await conexao.query<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) AS total FROM participantes");
    expect(Number(linhas[0]?.total)).toBe(0);
  });
});
