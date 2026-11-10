import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { BRUNA, criarAppTeste, LARISSA } from "../apoio/criarAppTeste.js";
import { comLogin, entrar } from "../apoio/sessao.js";

const CARLA = { ...LARISSA, nome: "Carla Dias", email: "carla@exemplo.com", cpf: "390.533.447-05" };
const SALA = { nome: "Sala da Larissa", segundosPorRodada: 90, rodadas: 1, maximoDeJogadores: 6 };

// Um relógio só para o app inteiro: cada teste cria a própria sala e faz o tempo andar.
const relogio = { agora: new Date("2026-11-10T15:00:00-03:00") };

function passar(segundos: number): void {
  relogio.agora = new Date(relogio.agora.getTime() + segundos * 1000);
}

let app: Express;
let larissa: string;
let bruna: string;
let carla: string;

beforeAll(async () => {
  app = criarAppTeste({ agora: () => relogio.agora }).app;
  larissa = (await entrar(app)).token;
  bruna = (await entrar(app, BRUNA)).token;
  carla = (await entrar(app, CARLA)).token;
}, 60_000);

function partida(token: string, salaId: number) {
  return request(app).get(`/salas/${salaId}/partida`).set(comLogin(token));
}

function comecar(token: string, salaId: number) {
  return request(app).post(`/salas/${salaId}/partida`).set(comLogin(token));
}

function escolher(token: string, salaId: number, corpo: object) {
  return request(app).post(`/salas/${salaId}/partida/palavra`).set(comLogin(token)).send(corpo);
}

function chutar(token: string, salaId: number, letra: string) {
  return request(app).post(`/salas/${salaId}/partida/letras`).set(comLogin(token)).send({ letra });
}

async function chutarTodas(token: string, salaId: number, letras: string): Promise<void> {
  for (const letra of letras) {
    expect((await chutar(token, salaId, letra)).status).toBe(200);
  }
}

// Larissa cria a sala e a Bruna entra; com comCarla, a Carla entra também.
async function criarSala(opcoes: { corpo?: object; comCarla?: boolean } = {}): Promise<number> {
  const sala = await request(app)
    .post("/salas")
    .set(comLogin(larissa))
    .send({ ...SALA, ...opcoes.corpo });
  await request(app).post(`/salas/${sala.body.id}/participantes`).set(comLogin(bruna)).send({ apelido: "Bru" });
  if (opcoes.comCarla) {
    await request(app).post(`/salas/${sala.body.id}/participantes`).set(comLogin(carla)).send({ apelido: "Carla" });
  }
  return sala.body.id;
}

async function salaComPalavra(palavra = "ARARA", opcoes: { comCarla?: boolean } = {}): Promise<number> {
  const salaId = await criarSala(opcoes);
  await comecar(larissa, salaId);
  await escolher(larissa, salaId, { palavra });
  return salaId;
}

describe("rotas da partida sem login", () => {
  it.each([
    ["get", "/salas/1/partida"],
    ["post", "/salas/1/partida"],
    ["post", "/salas/1/partida/palavra"],
    ["post", "/salas/1/partida/letras"],
  ] as const)("%s %s pede login", async (metodo, caminho) => {
    const resposta = await request(app)[metodo](caminho).send({ letra: "A" });

    expect(resposta.status).toBe(401);
  });
});

describe("POST /salas/:salaId/partida", () => {
  it("começa pela vez de quem criou a sala, que tem 20 segundos para escolher a palavra", async () => {
    const salaId = await criarSala();

    const resposta = await comecar(larissa, salaId);
    const daBruna = await partida(bruna, salaId);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      situacao: "jogando",
      rodadas: 1,
      placar: [
        { apelido: "Larissa", pontos: 0 },
        { apelido: "Bru", pontos: 0 },
      ],
      vez: { numero: 1, rodada: 1, fase: "escolhendo", segundosRestantes: 20, escolhedor: { apelido: "Larissa" }, opcoes: [] },
      anterior: null,
    });
    expect(daBruna.body.vez.opcoes).toBeNull();
    expect((await request(app).get(`/salas/${salaId}`).set(comLogin(bruna))).body.situacao).toBe("jogando");
  });

  it("só quem criou a sala começa, uma vez só", async () => {
    const salaId = await criarSala();

    expect((await comecar(bruna, salaId)).status).toBe(403);
    expect((await comecar(larissa, salaId)).status).toBe(201);
    expect((await comecar(larissa, salaId)).status).toBe(409);
  });

  it("precisa de pelo menos 2 jogadores", async () => {
    const sala = await request(app).post("/salas").set(comLogin(larissa)).send(SALA);

    const resposta = await comecar(larissa, sala.body.id);

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toContain("pelo menos 2 jogadores");
  });

  it("não mostra a partida a quem não está na sala, nem de sala que não existe", async () => {
    const salaId = await criarSala();

    expect((await partida(carla, salaId)).status).toBe(403);
    expect((await partida(larissa, 999_999)).status).toBe(404);
    expect((await partida(larissa, 0)).status).toBe(400);
  });
});

describe("POST /salas/:salaId/partida/palavra", () => {
  it("quem está na vez digita a palavra; só essa pessoa vê a palavra, os outros veem as casas", async () => {
    const salaId = await criarSala();
    await comecar(larissa, salaId);
    passar(3);

    const daLarissa = await escolher(larissa, salaId, { palavra: "  pão de queijo ", dica: "Mineiro" });
    const daBruna = await partida(bruna, salaId);

    expect(daLarissa.status).toBe(200);
    expect(daLarissa.body.vez).toMatchObject({ fase: "adivinhando", segundosRestantes: 90, palavra: "PÃO DE QUEIJO", minhaForca: null });
    expect(daBruna.body.vez).toMatchObject({ palavra: null, dica: "Mineiro" });
    expect(daBruna.body.vez.minhaForca.casas).toEqual([null, null, null, " ", null, null, " ", null, null, null, null, null, null]);
    expect(JSON.stringify(daBruna.body)).not.toContain("QUEIJO");
  });

  it("recusa quem não está na vez, a palavra inválida e a segunda escolha", async () => {
    const salaId = await criarSala();
    await comecar(larissa, salaId);

    expect((await escolher(bruna, salaId, { palavra: "ARARA" })).status).toBe(403);
    const invalida = await escolher(larissa, salaId, { palavra: "R2D2" });
    expect(invalida.status).toBe(400);
    expect(invalida.body.campos.palavra).toBeDefined();
    expect((await escolher(larissa, salaId, { palavra: "ARARA" })).status).toBe(200);
    expect((await escolher(larissa, salaId, { palavra: "MACACO" })).status).toBe(409);
  });

  it("com lista, quem está na vez escolhe uma de 3 palavras sorteadas, que não mudam até a escolha", async () => {
    const lista = await request(app).post("/listas").set(comLogin(larissa)).send({ nome: `Bichos ${Date.now()}` });
    for (const palavra of ["GATO", "PATO", "SAPO", "RATO"]) {
      await request(app).post(`/listas/${lista.body.id}/palavras`).set(comLogin(larissa)).send({ palavra, dica: "Bicho" });
    }
    const salaId = await criarSala({ corpo: { listaId: lista.body.id } });

    const opcoes = (await comecar(larissa, salaId)).body.vez.opcoes;
    const deNovo = (await partida(larissa, salaId)).body.vez.opcoes;
    const foraDaLista = (await escolher(larissa, salaId, { palavra: "MACACO" })).status;
    const foraDasOpcoes = (await escolher(larissa, salaId, { palavraId: 999_999 })).status;
    const escolhida = await escolher(larissa, salaId, { palavraId: opcoes[1].id });

    expect(opcoes).toHaveLength(3);
    expect(deNovo).toEqual(opcoes);
    expect(foraDaLista).toBe(400);
    expect(foraDasOpcoes).toBe(400);
    expect(escolhida.body.vez).toMatchObject({ fase: "adivinhando", palavra: opcoes[1].palavra, dica: "Bicho" });
  });

  it("sorteia uma palavra oficial, com a categoria como dica, se ninguém escolher em 20 segundos", async () => {
    const salaId = await criarSala();
    await comecar(larissa, salaId);
    passar(20);

    const resposta = await partida(bruna, salaId);

    expect(resposta.body.vez).toMatchObject({ fase: "adivinhando", segundosRestantes: 90 });
    expect(["Comida", "Animais"]).toContain(resposta.body.vez.dica);
  });
});

describe("POST /salas/:salaId/partida/letras", () => {
  it("abre as casas da letra certa e conta a errada só na forca de quem chutou", async () => {
    const salaId = await salaComPalavra("ARARA", { comCarla: true });

    await chutar(bruna, salaId, "a");
    const resposta = await chutar(bruna, salaId, "Z");
    const daCarla = await partida(carla, salaId);

    expect(resposta.status).toBe(200);
    expect(resposta.body.vez.minhaForca).toEqual({
      casas: ["A", null, "A", null, "A"],
      letras: ["A", "Z"],
      erros: 1,
      acertou: false,
      terminou: false,
    });
    expect(daCarla.body.vez.minhaForca.erros).toBe(0);
    expect(daCarla.body.vez.forcas).toEqual([
      { participanteId: expect.any(Number), apelido: "Bru", erros: 1, casasAbertas: 3, acertou: false, terminou: false },
      { participanteId: expect.any(Number), apelido: "Carla", erros: 0, casasAbertas: 0, acertou: false, terminou: false },
    ]);
  });

  it("recusa a letra de quem escolheu, a letra inválida, a repetida e o chute antes da palavra", async () => {
    const salaId = await criarSala();
    await comecar(larissa, salaId);

    expect((await chutar(bruna, salaId, "A")).status).toBe(409);
    await escolher(larissa, salaId, { palavra: "ARARA" });
    expect((await chutar(larissa, salaId, "A")).status).toBe(403);
    expect((await chutar(bruna, salaId, "1")).status).toBe(400);
    expect((await chutar(bruna, salaId, "Ç")).status).toBe(400);
    await chutar(bruna, salaId, "A");
    const repetida = await chutar(bruna, salaId, "A");
    expect(repetida.status).toBe(409);
    expect(repetida.body.mensagem).toBe("Você já chutou a letra A.");
  });

  it("não aceita letra depois que a forca da pessoa terminou", async () => {
    const salaId = await salaComPalavra("ARARA", { comCarla: true });
    await chutarTodas(bruna, salaId, "AR");

    const resposta = await chutar(bruna, salaId, "Z");

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("A sua forca nesta vez já terminou.");
  });
});

describe("andamento da partida", () => {
  it("termina a vez quando todos terminam, dá os pontos e passa a vez depois de 5 segundos", async () => {
    const salaId = await salaComPalavra("ARARA", { comCarla: true });

    await chutarTodas(bruna, salaId, "AR");
    await chutarTodas(carla, salaId, "ZAR");
    const resposta = await partida(larissa, salaId);

    expect(resposta.body.vez).toMatchObject({ numero: 2, fase: "intervalo", segundosRestantes: 5, escolhedor: { apelido: "Bru" } });
    expect(resposta.body.anterior).toMatchObject({
      numero: 1,
      palavra: "ARARA",
      escolhedor: { apelido: "Larissa" },
      pontosDeQuemEscolheu: 20,
      jogadores: [
        { apelido: "Bru", acertou: true, erros: 0, pontos: 120 },
        { apelido: "Carla", acertou: true, erros: 1, pontos: 90 },
      ],
    });
    expect(resposta.body.placar.map(({ apelido, pontos }: { apelido: string; pontos: number }) => [apelido, pontos])).toEqual([
      ["Bru", 120],
      ["Carla", 90],
      ["Larissa", 20],
    ]);

    passar(5);
    expect((await partida(bruna, salaId)).body.vez).toMatchObject({ fase: "escolhendo", segundosRestantes: 20 });
  });

  it("termina a vez quando o tempo acaba e encerra a partida depois da última vez", async () => {
    const salaId = await salaComPalavra("ARARA");
    await chutar(bruna, salaId, "Z");

    passar(90);
    const segundaVez = await partida(larissa, salaId);
    passar(5);
    await escolher(bruna, salaId, { palavra: "MACACO" });
    passar(90);
    const fim = await partida(bruna, salaId);

    expect(segundaVez.body.anterior).toMatchObject({ palavra: "ARARA", jogadores: [{ apelido: "Bru", acertou: false, pontos: 0 }] });
    expect(segundaVez.body.vez).toMatchObject({ numero: 2, rodada: 1, escolhedor: { apelido: "Bru" } });
    expect(fim.body).toMatchObject({ situacao: "encerrada", vez: null, anterior: { numero: 2, palavra: "MACACO" } });
    expect((await chutar(larissa, salaId, "A")).status).toBe(409);
  });

  it("com 2 rodadas, cada um escolhe duas vezes, na ordem em que entrou", async () => {
    const salaId = await criarSala({ corpo: { rodadas: 2 } });
    await comecar(larissa, salaId);
    const escolhedores: string[] = [];

    // Ninguém escolhe nem chuta: a cada fase, alguém pergunta pela sala e ela anda.
    for (let vez = 1; vez <= 4; vez++) {
      const estado = (await partida(larissa, salaId)).body;
      escolhedores.push(`${estado.vez.rodada}:${estado.vez.escolhedor.apelido}`);
      passar(20);
      await partida(larissa, salaId);
      passar(90);
      await partida(larissa, salaId);
      passar(5);
    }

    expect(escolhedores).toEqual(["1:Larissa", "1:Bru", "2:Larissa", "2:Bru"]);
    expect((await partida(larissa, salaId)).body.situacao).toBe("encerrada");
  });

  it("se quem está na vez sai da sala, a vez passa para o próximo", async () => {
    const salaId = await salaComPalavra("ARARA", { comCarla: true });
    await chutarTodas(bruna, salaId, "AR");
    await chutarTodas(carla, salaId, "AR");
    const daBruna = await partida(bruna, salaId);
    passar(5);

    await request(app).delete(`/salas/${salaId}/participantes/${daBruna.body.eu}`).set(comLogin(bruna));
    const resposta = await partida(larissa, salaId);

    expect(resposta.body.vez).toMatchObject({ numero: 2, fase: "escolhendo", escolhedor: { apelido: "Carla" } });
  });

  it("encerra a partida quando fica só uma pessoa na sala", async () => {
    const salaId = await salaComPalavra();
    const daBruna = await partida(bruna, salaId);

    await request(app).delete(`/salas/${salaId}/participantes/${daBruna.body.eu}`).set(comLogin(bruna));

    expect((await partida(larissa, salaId)).body).toMatchObject({ situacao: "encerrada", vez: null });
  });
});
