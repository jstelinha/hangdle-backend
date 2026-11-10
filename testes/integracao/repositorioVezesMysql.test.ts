import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NovaVez } from "../../src/dominio/Vez.js";
import { ErroConflito } from "../../src/erros/ErroAplicacao.js";
import { RepositorioVezesMysql } from "../../src/repositorios/RepositorioVezesMysql.js";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

const COMECO = new Date("2026-11-10T15:00:00.250-03:00");

let conexao: Connection;
let vezes: RepositorioVezesMysql;
let larissa: number;
let salaId: number;
let lari: number;
let bru: number;

function primeira(valores: Partial<NovaVez> = {}): NovaVez {
  return { numero: 1, rodada: 1, escolhedorId: lari, comecaEm: COMECO, ...valores };
}

async function inserir(sql: string, valores: (string | number | null)[]): Promise<number> {
  const [resultado] = await conexao.execute<ResultSetHeader>(sql, valores);
  return resultado.insertId;
}

async function situacaoDaSala(): Promise<string | undefined> {
  const [linhas] = await conexao.query<(RowDataPacket & { situacao: string })[]>("SELECT situacao FROM salas WHERE id = ?", [salaId]);
  return linhas[0]?.situacao;
}

async function pontos(): Promise<number[]> {
  const [linhas] = await conexao.query<(RowDataPacket & { pontos: number })[]>(
    "SELECT pontos FROM participantes WHERE sala_id = ? ORDER BY id",
    [salaId],
  );
  return linhas.map((linha) => linha.pontos);
}

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
  vezes = new RepositorioVezesMysql(conexao);
});

afterAll(async () => {
  await conexao.end();
});

beforeEach(async () => {
  await conexao.beginTransaction();
  await esvaziarTabelasDoJogo(conexao);
  await conexao.query("DELETE FROM usuarios");
  larissa = await inserirUsuario(conexao);
  const bruna = await inserirUsuario(conexao, "bruna.teste@exemplo.com", "11144477735");
  salaId = await inserir("INSERT INTO salas (dono_id, nome) VALUES (?, 'Sala da Larissa')", [larissa]);
  lari = await inserir("INSERT INTO participantes (sala_id, usuario_id, apelido, pontos) VALUES (?, ?, 'Lari', 30)", [salaId, larissa]);
  bru = await inserir("INSERT INTO participantes (sala_id, usuario_id, apelido) VALUES (?, ?, 'Bru')", [salaId, bruna]);
});

afterEach(async () => {
  await conexao.rollback();
});

describe("partida no MySQL", () => {
  it("começa uma vez só: muda a sala para jogando, zera os pontos e cria a primeira vez", async () => {
    expect(await vezes.comecarPartida(salaId, primeira())).toBe(true);
    expect(await vezes.comecarPartida(salaId, primeira())).toBe(false);

    expect(await situacaoDaSala()).toBe("jogando");
    expect(await pontos()).toEqual([0, 0]);
    expect(await vezes.ultimas(salaId, 5)).toEqual([
      {
        id: expect.any(Number),
        numero: 1,
        rodada: 1,
        escolhedorId: lari,
        palavra: null,
        dica: null,
        comecaEm: COMECO,
        escolhidaEm: null,
        terminouEm: null,
      },
    ]);
  });

  it("ignora a mesma vez criada duas vezes e traz as últimas da mais nova para a mais velha", async () => {
    await vezes.comecarPartida(salaId, primeira());
    await vezes.criar(salaId, primeira({ numero: 2, escolhedorId: bru }));
    await vezes.criar(salaId, primeira({ numero: 2, escolhedorId: lari }));

    const ultimas = await vezes.ultimas(salaId, 1);

    expect(ultimas).toHaveLength(1);
    expect(ultimas[0]).toMatchObject({ numero: 2, escolhedorId: bru });
  });

  it("escolhe a palavra e termina a vez uma vez só, somando os pontos uma vez só", async () => {
    await vezes.comecarPartida(salaId, primeira());
    const [vez] = await vezes.ultimas(salaId, 1);
    const id = vez?.id ?? 0;
    const ganhos = new Map([
      [bru, 120],
      [lari, 10],
    ]);

    expect(await vezes.escolherPalavra(id, { palavra: "ARARA", dica: "Ave" }, COMECO)).toBe(true);
    expect(await vezes.escolherPalavra(id, { palavra: "MACACO", dica: null }, COMECO)).toBe(false);
    expect(await vezes.terminar(id, COMECO, ganhos)).toBe(true);
    expect(await vezes.terminar(id, COMECO, ganhos)).toBe(false);

    expect(await pontos()).toEqual([10, 120]);
    expect((await vezes.ultimas(salaId, 1))[0]).toMatchObject({ palavra: "ARARA", dica: "Ave", escolhidaEm: COMECO, terminouEm: COMECO });
  });

  it("guarda as letras na ordem em que foram chutadas e recusa a repetida", async () => {
    await vezes.comecarPartida(salaId, primeira());
    const id = (await vezes.ultimas(salaId, 1))[0]?.id ?? 0;
    await vezes.escolherPalavra(id, { palavra: "ARARA", dica: null }, COMECO);

    await vezes.guardarLetra(id, { participanteId: bru, letra: "Z" });
    await vezes.guardarLetra(id, { participanteId: bru, letra: "A" });

    expect(await vezes.letras(id)).toEqual([
      { participanteId: bru, letra: "Z" },
      { participanteId: bru, letra: "A" },
    ]);
    await expect(vezes.guardarLetra(id, { participanteId: bru, letra: "A" })).rejects.toBeInstanceOf(ErroConflito);
  });

  it("encerra só a partida que está em jogo", async () => {
    await vezes.encerrarPartida(salaId);
    expect(await situacaoDaSala()).toBe("esperando");

    await vezes.comecarPartida(salaId, primeira());
    await vezes.encerrarPartida(salaId);
    expect(await situacaoDaSala()).toBe("encerrada");
  });
});

describe("palavras para escolher", () => {
  it("sorteia da lista as que ainda não saíram, sempre as mesmas para a mesma vez", async () => {
    const listaId = await inserir("INSERT INTO listas (usuario_id, nome) VALUES (?, 'Bichos')", [larissa]);
    for (const texto of ["GATO", "PATO", "SAPO", "RATO", "ARARA"]) {
      await inserir("INSERT INTO palavras_das_listas (lista_id, texto, dica) VALUES (?, ?, 'Bicho')", [listaId, texto]);
    }
    await vezes.comecarPartida(salaId, primeira());
    const id = (await vezes.ultimas(salaId, 1))[0]?.id ?? 0;
    await vezes.escolherPalavra(id, { palavra: "ARARA", dica: null }, COMECO);
    await vezes.criar(salaId, primeira({ numero: 2, escolhedorId: bru }));
    const segunda = (await vezes.ultimas(salaId, 1))[0]?.id ?? 0;

    const opcoes = await vezes.opcoesDaLista(salaId, listaId, segunda, 3);

    expect(opcoes).toHaveLength(3);
    expect(opcoes.map((opcao) => opcao.palavra)).not.toContain("ARARA");
    expect(opcoes[0]).toEqual({ id: expect.any(Number), palavra: expect.any(String), dica: "Bicho" });
    expect(await vezes.opcoesDaLista(salaId, listaId, segunda, 3)).toEqual(opcoes);
    expect(await vezes.opcoesDaLista(salaId, listaId, segunda, 10)).toHaveLength(4);
  });

  it("sorteia uma palavra oficial que ainda não saiu, com a categoria como dica", async () => {
    const categoriaId = await inserir("INSERT INTO categorias (nome) VALUES ('Animais')", []);
    await inserir("INSERT INTO palavras (texto, categoria_id) VALUES ('ARARA', ?)", [categoriaId]);
    await inserir("INSERT INTO palavras (texto, categoria_id) VALUES ('MACACO', ?)", [categoriaId]);
    await vezes.comecarPartida(salaId, primeira());
    const id = (await vezes.ultimas(salaId, 1))[0]?.id ?? 0;
    await vezes.escolherPalavra(id, { palavra: "ARARA", dica: null }, COMECO);

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      expect(await vezes.sortearPalavraOficial(salaId)).toEqual({ palavra: "MACACO", dica: "Animais" });
    }
  });
});
