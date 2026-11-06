import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { BRUNA, criarAppTeste, LARISSA } from "../apoio/criarAppTeste.js";
import { comLogin, entrar } from "../apoio/sessao.js";

const CARLA = { ...LARISSA, nome: "Carla Dias", email: "carla@exemplo.com", cpf: "390.533.447-05" };
const SALA = { nome: "Sala da Larissa", segundosPorRodada: 90, rodadas: 2, maximoDeJogadores: 6 };

async function criarSala(app: Express, token: string, corpo: object = {}): Promise<number> {
  const resposta = await request(app)
    .post("/salas")
    .set(comLogin(token))
    .send({ ...SALA, ...corpo });
  return resposta.body.id;
}

function entrarNaSala(app: Express, token: string, salaId: number, corpo: object = {}) {
  return request(app)
    .post(`/salas/${salaId}/participantes`)
    .set(comLogin(token))
    .send({ apelido: "Bru", ...corpo });
}

function listarJogadores(app: Express, token: string, salaId: number, consulta = "") {
  return request(app).get(`/salas/${salaId}/participantes${consulta}`).set(comLogin(token));
}

// Larissa cria a sala; Bruna e Carla têm conta e ainda não entraram.
async function appComSala(opcoes: { sala?: object; tentativasPorJanela?: number } = {}) {
  const contexto = criarAppTeste({ tentativasPorJanela: opcoes.tentativasPorJanela });
  const larissa = await entrar(contexto.app);
  const bruna = await entrar(contexto.app, BRUNA);
  const carla = await entrar(contexto.app, CARLA);
  const salaId = await criarSala(contexto.app, larissa.token, opcoes.sala);
  return { ...contexto, larissa, bruna, carla, salaId };
}

describe("rotas de participantes sem login", () => {
  it.each([
    ["get", "/salas/1/participantes"],
    ["get", "/salas/1/participantes/1"],
    ["post", "/salas/1/participantes"],
    ["put", "/salas/1/participantes/1"],
    ["delete", "/salas/1/participantes/1"],
  ] as const)("%s %s pede login", async (metodo, caminho) => {
    const { app } = criarAppTeste();

    const resposta = await request(app)[metodo](caminho).send({ apelido: "Bru" });

    expect(resposta.status).toBe(401);
  });
});

describe("POST /salas/:salaId/participantes", () => {
  it("entra numa sala pública com um apelido", async () => {
    const { app, bruna, salaId } = await appComSala();

    const resposta = await entrarNaSala(app, bruna.token, salaId, { apelido: "  Bru  " });
    const sala = await request(app).get(`/salas/${salaId}`).set(comLogin(bruna.token));

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ id: expect.any(Number), salaId, usuarioId: bruna.id, apelido: "Bru", pontos: 0, dono: false });
    expect(sala.body.jogadores).toBe(2);
  });

  it("entra numa sala com senha só com a senha certa", async () => {
    const { app, bruna, salaId } = await appComSala({ sala: { senha: "forca" } });

    const semSenha = await entrarNaSala(app, bruna.token, salaId);
    const senhaErrada = await entrarNaSala(app, bruna.token, salaId, { senha: "errada" });
    const senhaCerta = await entrarNaSala(app, bruna.token, salaId, { senha: "forca" });

    expect(semSenha.status).toBe(403);
    expect(semSenha.body.campos.senha).toBe("Esta sala tem senha. Digite a senha para entrar.");
    expect(senhaErrada.status).toBe(403);
    expect(senhaErrada.body.campos.senha).toBe("Senha da sala incorreta.");
    expect(senhaCerta.status).toBe(201);
  });

  it("bloqueia depois de muitas tentativas erradas, como no login", async () => {
    const { app, bruna, salaId } = await appComSala({ sala: { senha: "forca" }, tentativasPorJanela: 3 });

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      await entrarNaSala(app, bruna.token, salaId, { senha: "errada" });
    }
    const bloqueada = await entrarNaSala(app, bruna.token, salaId, { senha: "forca" });

    expect(bloqueada.status).toBe(429);
  });

  it("não deixa entrar duas vezes, nem quem criou a sala", async () => {
    const { app, larissa, bruna, salaId } = await appComSala();
    await entrarNaSala(app, bruna.token, salaId);

    const deNovo = await entrarNaSala(app, bruna.token, salaId, { apelido: "Outra" });
    const dona = await entrarNaSala(app, larissa.token, salaId, { apelido: "Lari" });

    expect(deNovo.status).toBe(409);
    expect(deNovo.body.mensagem).toBe("Você já está nesta sala.");
    expect(dona.status).toBe(409);
  });

  it("recusa um apelido que já está em uso na sala", async () => {
    const { app, bruna, carla, salaId } = await appComSala();
    await entrarNaSala(app, bruna.token, salaId, { apelido: "Bru" });

    const resposta = await entrarNaSala(app, carla.token, salaId, { apelido: "BRU" });

    expect(resposta.status).toBe(409);
    expect(resposta.body.campos.apelido).toBe("Esse apelido já está em uso nesta sala.");
  });

  it("recusa quem chega com a sala cheia", async () => {
    const { app, bruna, carla, salaId } = await appComSala({ sala: { maximoDeJogadores: 2 } });
    await entrarNaSala(app, bruna.token, salaId);

    const resposta = await entrarNaSala(app, carla.token, salaId, { apelido: "Carla" });

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("A sala está cheia.");
  });

  it("não entra numa sala encerrada", async () => {
    const { app, bruna, salaId, salas } = await appComSala();
    salas.mudarSituacao(salaId, "encerrada");

    const resposta = await entrarNaSala(app, bruna.token, salaId);

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("Essa sala já foi encerrada.");
  });

  it("responde 404 para uma sala que não existe", async () => {
    const { app, bruna } = await appComSala();

    const resposta = await entrarNaSala(app, bruna.token, 999);

    expect(resposta.status).toBe(404);
  });

  it.each([
    ["sem apelido", { apelido: undefined }, "Escolha um apelido."],
    ["apelido curto", { apelido: "B" }, "O apelido precisa ter de 2 a 20 caracteres."],
    ["apelido longo", { apelido: "B".repeat(21) }, "O apelido precisa ter de 2 a 20 caracteres."],
  ])("recusa %s", async (_caso, corpo, mensagem) => {
    const { app, bruna, salaId } = await appComSala();

    const resposta = await entrarNaSala(app, bruna.token, salaId, corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.apelido).toBe(mensagem);
  });
});

describe("GET /salas/:salaId/participantes", () => {
  it("mostra quem está na sala, na ordem em que chegou, com o dono marcado e em páginas", async () => {
    const { app, bruna, carla, salaId } = await appComSala();
    await entrarNaSala(app, bruna.token, salaId, { apelido: "Bru" });
    await entrarNaSala(app, carla.token, salaId, { apelido: "Carla" });

    const primeira = await listarJogadores(app, bruna.token, salaId, "?porPagina=2");
    const segunda = await listarJogadores(app, bruna.token, salaId, "?pagina=2&porPagina=2");

    expect(primeira.status).toBe(200);
    expect(primeira.body).toMatchObject({ total: 3, totalDePaginas: 2 });
    expect(primeira.body.itens.map((jogador: { apelido: string; dono: boolean }) => [jogador.apelido, jogador.dono])).toEqual([
      ["Larissa", true],
      ["Bru", false],
    ]);
    expect(segunda.body.itens.map((jogador: { apelido: string }) => jogador.apelido)).toEqual(["Carla"]);
  });

  it("só quem está na sala vê quem está nela", async () => {
    const { app, bruna, salaId } = await appComSala();

    const resposta = await listarJogadores(app, bruna.token, salaId);

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toBe("Entre na sala para ver quem está nela.");
  });
});

describe("GET, PUT e DELETE /salas/:salaId/participantes/:id", () => {
  it("troca o próprio apelido", async () => {
    const { app, bruna, salaId } = await appComSala();
    const entrada = await entrarNaSala(app, bruna.token, salaId);
    const caminho = `/salas/${salaId}/participantes/${entrada.body.id}`;

    const resposta = await request(app).put(caminho).set(comLogin(bruna.token)).send({ apelido: "Bruninha" });
    const depois = await request(app).get(caminho).set(comLogin(bruna.token));

    expect(resposta.status).toBe(200);
    expect(resposta.body.apelido).toBe("Bruninha");
    expect(depois.body.apelido).toBe("Bruninha");
  });

  it("não troca o apelido de outra pessoa, nem sendo o dono da sala", async () => {
    const { app, larissa, bruna, salaId } = await appComSala();
    const entrada = await entrarNaSala(app, bruna.token, salaId);

    const resposta = await request(app)
      .put(`/salas/${salaId}/participantes/${entrada.body.id}`)
      .set(comLogin(larissa.token))
      .send({ apelido: "Mudei" });

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toBe("Você só pode trocar o seu próprio apelido.");
  });

  it("não troca para um apelido que já está em uso", async () => {
    const { app, bruna, salaId } = await appComSala();
    const entrada = await entrarNaSala(app, bruna.token, salaId);

    const resposta = await request(app)
      .put(`/salas/${salaId}/participantes/${entrada.body.id}`)
      .set(comLogin(bruna.token))
      .send({ apelido: "larissa" });

    expect(resposta.status).toBe(409);
  });

  it("sai da sala", async () => {
    const { app, larissa, bruna, salaId } = await appComSala();
    const entrada = await entrarNaSala(app, bruna.token, salaId);

    const resposta = await request(app).delete(`/salas/${salaId}/participantes/${entrada.body.id}`).set(comLogin(bruna.token));
    const sala = await request(app).get(`/salas/${salaId}`).set(comLogin(larissa.token));

    expect(resposta.status).toBe(204);
    expect(sala.body.jogadores).toBe(1);
  });

  it("deixa o dono tirar alguém da sala, mas não outro jogador", async () => {
    const { app, larissa, bruna, carla, salaId } = await appComSala();
    const daBruna = await entrarNaSala(app, bruna.token, salaId);
    const daCarla = await entrarNaSala(app, carla.token, salaId, { apelido: "Carla" });

    const carlaTiraBruna = await request(app).delete(`/salas/${salaId}/participantes/${daBruna.body.id}`).set(comLogin(carla.token));
    const donaTiraCarla = await request(app).delete(`/salas/${salaId}/participantes/${daCarla.body.id}`).set(comLogin(larissa.token));

    expect(carlaTiraBruna.status).toBe(403);
    expect(carlaTiraBruna.body.mensagem).toBe("Só quem criou a sala pode tirar outra pessoa.");
    expect(donaTiraCarla.status).toBe(204);
  });

  it("não deixa quem criou a sala sair dela", async () => {
    const { app, larissa, salaId } = await appComSala();
    const jogadores = await listarJogadores(app, larissa.token, salaId);

    const resposta = await request(app)
      .delete(`/salas/${salaId}/participantes/${jogadores.body.itens[0].id}`)
      .set(comLogin(larissa.token));

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("Quem criou a sala não sai dela. Para acabar com a sala, apague a sala.");
  });

  it.each(["get", "put", "delete"] as const)("%s responde 404 para um jogador que não existe ou é de outra sala", async (metodo) => {
    const { app, larissa, bruna, salaId } = await appComSala();
    const outraSala = await criarSala(app, bruna.token, { nome: "Da Bruna" });
    const jogadoresDaOutra = await listarJogadores(app, bruna.token, outraSala);

    const inexistente = await request(app)[metodo](`/salas/${salaId}/participantes/999`).set(comLogin(larissa.token)).send({ apelido: "Novo" });
    const deOutraSala = await request(app)
      [metodo](`/salas/${salaId}/participantes/${jogadoresDaOutra.body.itens[0].id}`)
      .set(comLogin(larissa.token))
      .send({ apelido: "Novo" });

    expect(inexistente.status).toBe(404);
    expect(deOutraSala.status).toBe(404);
    expect(deOutraSala.body.mensagem).toBe("Jogador não encontrado nesta sala.");
  });
});

describe("máximo de jogadores ao editar a sala", () => {
  it("não baixa o máximo para menos do que os jogadores que já estão na sala", async () => {
    const { app, larissa, bruna, carla, salaId } = await appComSala();
    await entrarNaSala(app, bruna.token, salaId);
    await entrarNaSala(app, carla.token, salaId, { apelido: "Carla" });

    const resposta = await request(app)
      .put(`/salas/${salaId}`)
      .set(comLogin(larissa.token))
      .send({ ...SALA, maximoDeJogadores: 2 });

    expect(resposta.status).toBe(409);
    expect(resposta.body.campos.maximoDeJogadores).toBe("Já há 3 jogadores na sala.");
  });
});
