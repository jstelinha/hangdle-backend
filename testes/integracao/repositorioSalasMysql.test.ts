import type { Connection } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RegistroSala } from "../../src/dominio/Sala.js";
import { SenhaDaSala } from "../../src/dominio/SenhaDaSala.js";
import { ErroConflito } from "../../src/erros/ErroAplicacao.js";
import { RepositorioParticipantesMysql } from "../../src/repositorios/RepositorioParticipantesMysql.js";
import { RepositorioSalasMysql } from "../../src/repositorios/RepositorioSalasMysql.js";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

const PUBLICA: RegistroSala = { nome: "Sala aberta", senhaHash: null, listaId: null, segundosPorRodada: 90, rodadas: 2, maximoDeJogadores: 6 };

let conexao: Connection;
let salas: RepositorioSalasMysql;
let participantes: RepositorioParticipantesMysql;
let larissa: number;
let bruna: number;
let carla: number;

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
  salas = new RepositorioSalasMysql(conexao);
  participantes = new RepositorioParticipantesMysql(conexao);
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

describe("salas no MySQL", () => {
  it("cria e busca com quantos jogadores estão nela, sem expor a senha", async () => {
    const senha = await SenhaDaSala.criar("forca");
    const criada = await salas.criar(larissa, { ...PUBLICA, senhaHash: senha.hash });
    await participantes.criar(criada.id, { usuarioId: larissa, apelido: "Lari" });

    const buscada = await salas.buscar(criada.id);

    expect(buscada).toEqual({ ...criada, jogadores: 1 });
    expect(buscada).toMatchObject({ privada: true, situacao: "esperando", donoId: larissa });
    expect(JSON.stringify(buscada)).not.toContain("$2");
  });

  it("devolve a senha da sala só para conferir", async () => {
    const senha = await SenhaDaSala.criar("forca");
    const comSenha = await salas.criar(larissa, { ...PUBLICA, senhaHash: senha.hash });
    const semSenha = await salas.criar(larissa, PUBLICA);

    expect(await (await salas.buscarSenha(comSenha.id))?.confere("forca")).toBe(true);
    expect(await (await salas.buscarSenha(comSenha.id))?.confere("errada")).toBe(false);
    expect(await salas.buscarSenha(semSenha.id)).toBeNull();
  });

  it("lista as abertas sem as com senha e sem as encerradas, das mais novas para as mais velhas", async () => {
    const primeira = await salas.criar(larissa, { ...PUBLICA, nome: "Primeira" });
    await salas.criar(larissa, { ...PUBLICA, nome: "Com senha", senhaHash: (await SenhaDaSala.criar("forca")).hash });
    const encerrada = await salas.criar(bruna, { ...PUBLICA, nome: "Encerrada" });
    await conexao.execute("UPDATE salas SET situacao = 'encerrada' WHERE id = ?", [encerrada.id]);
    await salas.criar(bruna, { ...PUBLICA, nome: "Segunda" });

    const pagina = await salas.listarAbertas({ pagina: 1, porPagina: 10 });

    expect(pagina.itens.map((sala) => sala.nome)).toEqual(["Segunda", "Primeira"]);
    expect(pagina.total).toBe(2);
    expect(pagina.itens.at(-1)?.id).toBe(primeira.id);
  });

  it("lista as salas em que a pessoa está, em páginas", async () => {
    const daLarissa = await salas.criar(larissa, { ...PUBLICA, nome: "Da Larissa" });
    const daBruna = await salas.criar(bruna, { ...PUBLICA, nome: "Da Bruna" });
    await salas.criar(bruna, { ...PUBLICA, nome: "Só da Bruna" });
    await participantes.criar(daLarissa.id, { usuarioId: larissa, apelido: "Lari" });
    await participantes.criar(daBruna.id, { usuarioId: larissa, apelido: "Lari" });

    const primeira = await salas.listar(larissa, { pagina: 1, porPagina: 1 });
    const segunda = await salas.listar(larissa, { pagina: 2, porPagina: 1 });

    expect(primeira).toMatchObject({ total: 2, totalDePaginas: 2 });
    expect([...primeira.itens, ...segunda.itens].map((sala) => sala.nome)).toEqual(["Da Bruna", "Da Larissa"]);
  });

  it("edita, mas recusa um máximo menor que os jogadores que já estão na sala", async () => {
    const sala = await salas.criar(larissa, PUBLICA);
    for (const [usuarioId, apelido] of [[larissa, "Lari"], [bruna, "Bru"], [carla, "Carla"]] as const) {
      await participantes.criar(sala.id, { usuarioId, apelido });
    }

    await salas.atualizar(sala.id, { ...PUBLICA, nome: "Nova", maximoDeJogadores: 3 });
    expect(await salas.buscar(sala.id)).toMatchObject({ nome: "Nova", maximoDeJogadores: 3 });

    await expect(salas.atualizar(sala.id, { ...PUBLICA, maximoDeJogadores: 2 })).rejects.toBeInstanceOf(ErroConflito);
  });

  it("apaga", async () => {
    const sala = await salas.criar(larissa, PUBLICA);

    await salas.apagar(sala.id);

    expect(await salas.buscar(sala.id)).toBeNull();
  });
});

describe("participantes no MySQL", () => {
  it("entra, diz quem é o dono e lista na ordem em que chegaram", async () => {
    const sala = await salas.criar(larissa, PUBLICA);
    const lari = await participantes.criar(sala.id, { usuarioId: larissa, apelido: "Lari" });
    const bru = await participantes.criar(sala.id, { usuarioId: bruna, apelido: "Bru" });

    const pagina = await participantes.listar(sala.id, { pagina: 1, porPagina: 10 });

    expect(lari).toEqual({ id: expect.any(Number), salaId: sala.id, usuarioId: larissa, apelido: "Lari", pontos: 0, dono: true });
    expect(bru.dono).toBe(false);
    expect(pagina.itens.map((participante) => participante.apelido)).toEqual(["Lari", "Bru"]);
    expect(await participantes.buscarNaSala(sala.id, bruna)).toEqual(bru);
    expect(await participantes.buscarNaSala(sala.id, carla)).toBeNull();
  });

  it("traduz o que o banco recusa: a mesma pessoa, o apelido repetido e a sala cheia", async () => {
    const sala = await salas.criar(larissa, { ...PUBLICA, maximoDeJogadores: 2 });
    await participantes.criar(sala.id, { usuarioId: larissa, apelido: "Lari" });

    await expect(participantes.criar(sala.id, { usuarioId: larissa, apelido: "Outra" })).rejects.toThrow("Você já está nesta sala.");
    await expect(participantes.criar(sala.id, { usuarioId: bruna, apelido: "lari" })).rejects.toThrow(
      "Esse apelido já está em uso nesta sala.",
    );
    await participantes.criar(sala.id, { usuarioId: bruna, apelido: "Bru" });
    await expect(participantes.criar(sala.id, { usuarioId: carla, apelido: "Carla" })).rejects.toThrow("A sala está cheia.");
  });

  it("troca o apelido e sai da sala", async () => {
    const sala = await salas.criar(larissa, PUBLICA);
    await participantes.criar(sala.id, { usuarioId: larissa, apelido: "Lari" });
    const bru = await participantes.criar(sala.id, { usuarioId: bruna, apelido: "Bru" });

    await participantes.atualizar(bru.id, { apelido: "Bruninha" });
    expect((await participantes.buscar(bru.id))?.apelido).toBe("Bruninha");
    await expect(participantes.atualizar(bru.id, { apelido: "LARI" })).rejects.toBeInstanceOf(ErroConflito);

    await participantes.apagar(bru.id);
    expect(await participantes.buscar(bru.id)).toBeNull();
  });
});
