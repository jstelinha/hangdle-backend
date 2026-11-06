import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { BRUNA, criarAppTeste } from "../apoio/criarAppTeste.js";
import { comLogin, entrar } from "../apoio/sessao.js";

const SALA = { nome: "Sala da Larissa", segundosPorRodada: 90, rodadas: 2, maximoDeJogadores: 6 };

function criarSala(app: Express, token: string, corpo: object = {}) {
  return request(app)
    .post("/salas")
    .set(comLogin(token))
    .send({ ...SALA, ...corpo });
}

function editarSala(app: Express, token: string, id: number, corpo: object = {}) {
  return request(app)
    .put(`/salas/${id}`)
    .set(comLogin(token))
    .send({ ...SALA, ...corpo });
}

async function appComLogin() {
  const contexto = criarAppTeste();
  const { id, token } = await entrar(contexto.app);
  return { ...contexto, usuarioId: id, token };
}

describe("rotas de salas sem login", () => {
  it.each([
    ["get", "/salas"],
    ["get", "/salas/1"],
    ["post", "/salas"],
    ["put", "/salas/1"],
    ["delete", "/salas/1"],
  ] as const)("%s %s pede login", async (metodo, caminho) => {
    const { app } = criarAppTeste();

    const resposta = await request(app)[metodo](caminho).send(SALA);

    expect(resposta.status).toBe(401);
  });
});

describe("POST /salas", () => {
  it("cria uma sala pública, e quem criou já está nela", async () => {
    const { app, token, usuarioId } = await appComLogin();

    const resposta = await criarSala(app, token);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({
      id: expect.any(Number),
      donoId: usuarioId,
      nome: "Sala da Larissa",
      privada: false,
      listaId: null,
      segundosPorRodada: 90,
      rodadas: 2,
      maximoDeJogadores: 6,
      jogadores: 1,
      situacao: "esperando",
    });
  });

  it("cria uma sala com senha, sem devolver a senha nem o hash", async () => {
    const { app, token } = await appComLogin();

    const resposta = await criarSala(app, token, { senha: "forca" });

    expect(resposta.status).toBe(201);
    expect(resposta.body.privada).toBe(true);
    expect(JSON.stringify(resposta.body)).not.toMatch(/senha|forca|\$2/);
  });

  it("trata a senha vazia como sala pública", async () => {
    const { app, token } = await appComLogin();

    const resposta = await criarSala(app, token, { senha: "" });

    expect(resposta.body.privada).toBe(false);
  });

  it("usa uma lista da própria pessoa", async () => {
    const { app, token } = await appComLogin();
    const lista = await request(app).post("/listas").set(comLogin(token)).send({ nome: "Frutas" });

    const resposta = await criarSala(app, token, { listaId: lista.body.id });

    expect(resposta.status).toBe(201);
    expect(resposta.body.listaId).toBe(lista.body.id);
  });

  it("não usa a lista de outra pessoa", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    const daBruna = await request(app).post("/listas").set(comLogin(bruna.token)).send({ nome: "Cores" });

    const resposta = await criarSala(app, token, { listaId: daBruna.body.id });

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toBe("Essa lista é de outra pessoa.");
  });

  it("não usa uma lista que não existe", async () => {
    const { app, token } = await appComLogin();

    const resposta = await criarSala(app, token, { listaId: 999 });

    expect(resposta.status).toBe(404);
  });

  it.each([
    ["sem nome", { nome: undefined }, "nome", "Informe o nome da sala."],
    ["nome curto", { nome: "A" }, "nome", "O nome da sala precisa ter de 2 a 40 caracteres."],
    ["tempo fora dos níveis", { segundosPorRodada: 60 }, "segundosPorRodada", "Escolha 45, 90 ou 120 segundos por rodada."],
    ["tempo como texto", { segundosPorRodada: "90" }, "segundosPorRodada", "Escolha 45, 90 ou 120 segundos por rodada."],
    ["nenhuma rodada", { rodadas: 0 }, "rodadas", "Escolha de 1 a 5 rodadas."],
    ["rodadas demais", { rodadas: 6 }, "rodadas", "Escolha de 1 a 5 rodadas."],
    ["rodada quebrada", { rodadas: 1.5 }, "rodadas", "Escolha de 1 a 5 rodadas."],
    ["só 1 jogador", { maximoDeJogadores: 1 }, "maximoDeJogadores", "Escolha de 2 a 10 jogadores."],
    ["jogadores demais", { maximoDeJogadores: 11 }, "maximoDeJogadores", "Escolha de 2 a 10 jogadores."],
    ["senha curta", { senha: "abc" }, "senha", "A senha da sala precisa ter de 4 a 30 caracteres."],
    ["senha longa", { senha: "a".repeat(31) }, "senha", "A senha da sala precisa ter de 4 a 30 caracteres."],
    ["senha que não é texto", { senha: 1234 }, "senha", "Envie a senha como texto."],
  ])("recusa %s", async (_caso, troca, campo, mensagem) => {
    const { app, token } = await appComLogin();

    const resposta = await criarSala(app, token, troca);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBe(mensagem);
  });
});

describe("GET /salas", () => {
  it("mostra as salas públicas abertas de todo mundo, das mais novas para as mais velhas, em páginas", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    await criarSala(app, token, { nome: "Primeira" });
    await criarSala(app, bruna.token, { nome: "Segunda" });
    await criarSala(app, bruna.token, { nome: "Com senha", senha: "forca" });
    await criarSala(app, token, { nome: "Terceira" });

    const primeira = await request(app).get("/salas?porPagina=2").set(comLogin(token));
    const segunda = await request(app).get("/salas?pagina=2&porPagina=2").set(comLogin(token));

    expect(primeira.status).toBe(200);
    expect(primeira.body).toMatchObject({ total: 3, totalDePaginas: 2 });
    expect(primeira.body.itens.map((sala: { nome: string }) => sala.nome)).toEqual(["Terceira", "Segunda"]);
    expect(segunda.body.itens.map((sala: { nome: string }) => sala.nome)).toEqual(["Primeira"]);
  });

  it("não mostra as salas que já acabaram", async () => {
    const { app, token, salas } = await appComLogin();
    const sala = await criarSala(app, token);
    salas.mudarSituacao(sala.body.id, "encerrada");

    const resposta = await request(app).get("/salas").set(comLogin(token));

    expect(resposta.body.total).toBe(0);
  });

  it("com filtro=minhas, mostra as salas em que a pessoa está, inclusive as com senha", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    await criarSala(app, token, { nome: "Minha com senha", senha: "forca" });
    await criarSala(app, bruna.token, { nome: "Da Bruna" });

    const resposta = await request(app).get("/salas?filtro=minhas").set(comLogin(token));

    expect(resposta.body.itens.map((sala: { nome: string }) => sala.nome)).toEqual(["Minha com senha"]);
  });

  it("recusa um filtro que não existe", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).get("/salas?filtro=todas").set(comLogin(token));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.filtro).toBe("Use filtro=abertas ou filtro=minhas.");
  });
});

describe("GET /salas/:id", () => {
  it("mostra a sala para qualquer pessoa com login, para ela decidir se entra", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    const sala = await criarSala(app, token, { senha: "forca" });

    const resposta = await request(app).get(`/salas/${sala.body.id}`).set(comLogin(bruna.token));

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ nome: "Sala da Larissa", privada: true, jogadores: 1 });
  });

  it("responde 404 para uma sala que não existe", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).get("/salas/999").set(comLogin(token));

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem).toBe("Sala não encontrada.");
  });
});

describe("PUT /salas/:id", () => {
  it("muda a configuração da sala", async () => {
    const { app, token } = await appComLogin();
    const sala = await criarSala(app, token);

    const resposta = await editarSala(app, token, sala.body.id, { nome: "Forca rápida", segundosPorRodada: 45, rodadas: 3 });
    const depois = await request(app).get(`/salas/${sala.body.id}`).set(comLogin(token));

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ nome: "Forca rápida", segundosPorRodada: 45, rodadas: 3, jogadores: 1 });
    expect(depois.body).toMatchObject({ nome: "Forca rápida", segundosPorRodada: 45, rodadas: 3 });
  });

  it("mantém a senha quando ela não vem, tira com null e põe com um texto", async () => {
    const { app, token } = await appComLogin();
    const sala = await criarSala(app, token, { senha: "forca" });
    const id = sala.body.id;

    const semSenhaNoCorpo = await editarSala(app, token, id);
    const comSenhaVazia = await editarSala(app, token, id, { senha: "" });
    const semSenha = await editarSala(app, token, id, { senha: null });
    const comNovaSenha = await editarSala(app, token, id, { senha: "outra" });

    expect(semSenhaNoCorpo.body.privada).toBe(true);
    expect(comSenhaVazia.body.privada).toBe(true);
    expect(semSenha.body.privada).toBe(false);
    expect(comNovaSenha.body.privada).toBe(true);
  });

  it("não deixa outra pessoa mudar a sala", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    const sala = await criarSala(app, token);

    const resposta = await editarSala(app, bruna.token, sala.body.id, { nome: "Da Bruna agora" });

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toBe("Só quem criou a sala pode mudar ou apagar a sala.");
  });

  it("não muda uma sala que não existe", async () => {
    const { app, token } = await appComLogin();

    const resposta = await editarSala(app, token, 999);

    expect(resposta.status).toBe(404);
  });

  it("não muda a sala depois que a partida começou", async () => {
    const { app, token, salas } = await appComLogin();
    const sala = await criarSala(app, token);
    salas.mudarSituacao(sala.body.id, "jogando");

    const resposta = await editarSala(app, token, sala.body.id, { nome: "Tarde demais" });

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("A partida já começou. Não dá mais para mudar a sala.");
  });

  it("valida os campos como na criação", async () => {
    const { app, token } = await appComLogin();
    const sala = await criarSala(app, token);

    const resposta = await editarSala(app, token, sala.body.id, { rodadas: 9, senha: "abc" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toMatchObject({
      rodadas: "Escolha de 1 a 5 rodadas.",
      senha: "A senha da sala precisa ter de 4 a 30 caracteres.",
    });
  });
});

describe("DELETE /salas/:id", () => {
  it("apaga a sala", async () => {
    const { app, token } = await appComLogin();
    const sala = await criarSala(app, token);

    const resposta = await request(app).delete(`/salas/${sala.body.id}`).set(comLogin(token));
    const depois = await request(app).get(`/salas/${sala.body.id}`).set(comLogin(token));

    expect(resposta.status).toBe(204);
    expect(depois.status).toBe(404);
  });

  it("não deixa outra pessoa apagar a sala", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    const sala = await criarSala(app, token);

    const resposta = await request(app).delete(`/salas/${sala.body.id}`).set(comLogin(bruna.token));
    const depois = await request(app).get(`/salas/${sala.body.id}`).set(comLogin(token));

    expect(resposta.status).toBe(403);
    expect(depois.status).toBe(200);
  });

  it("não apaga uma sala que não existe", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).delete("/salas/999").set(comLogin(token));

    expect(resposta.status).toBe(404);
  });
});
