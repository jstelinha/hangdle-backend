import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { BRUNA, criarAppTeste } from "../apoio/criarAppTeste.js";
import { comLogin, entrar } from "../apoio/sessao.js";

async function criarLista(app: Express, token: string, nome: string): Promise<number> {
  const resposta = await request(app).post("/listas").set(comLogin(token)).send({ nome });
  return resposta.body.id;
}

async function appComLogin() {
  const { app } = criarAppTeste();
  const { id, token } = await entrar(app);
  return { app, usuarioId: id, token };
}

describe("rotas de listas sem login", () => {
  it.each([
    ["get", "/listas"],
    ["get", "/listas/1"],
    ["post", "/listas"],
    ["put", "/listas/1"],
    ["delete", "/listas/1"],
  ] as const)("%s %s pede login", async (metodo, caminho) => {
    const { app } = criarAppTeste();

    const resposta = await request(app)[metodo](caminho).send({ nome: "Frutas" });

    expect(resposta.status).toBe(401);
  });
});

describe("POST /listas", () => {
  it("cria a lista da pessoa logada, sem espaços sobrando no nome", async () => {
    const { app, token, usuarioId } = await appComLogin();

    const resposta = await request(app).post("/listas").set(comLogin(token)).send({ nome: "  Frutas   da feira " });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ id: expect.any(Number), usuarioId, nome: "Frutas da feira", totalDePalavras: 0 });
  });

  it.each([
    ["sem nome", {}, "Informe o nome da lista."],
    ["nome curto", { nome: " A " }, "O nome da lista precisa ter de 2 a 40 caracteres."],
    ["nome longo", { nome: "A".repeat(41) }, "O nome da lista precisa ter de 2 a 40 caracteres."],
    ["nome que não é texto", { nome: 42 }, "Envie este campo como texto."],
  ])("recusa %s", async (_caso, corpo, mensagem) => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).post("/listas").set(comLogin(token)).send(corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.nome).toBe(mensagem);
  });

  it("recusa um nome que a pessoa já usou, mesmo com outras maiúsculas e acentos", async () => {
    const { app, token } = await appComLogin();
    await criarLista(app, token, "Ação");

    const resposta = await request(app).post("/listas").set(comLogin(token)).send({ nome: "acao" });

    expect(resposta.status).toBe(409);
    expect(resposta.body.campos.nome).toBe("Você já tem uma lista com esse nome.");
  });

  it("deixa outra pessoa usar o mesmo nome", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    await criarLista(app, token, "Frutas");

    const resposta = await request(app).post("/listas").set(comLogin(bruna.token)).send({ nome: "Frutas" });

    expect(resposta.status).toBe(201);
  });
});

describe("GET /listas", () => {
  it("mostra só as listas de quem está logado, em ordem alfabética e em páginas", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    for (const nome of ["Países", "Animais", "Frutas"]) {
      await criarLista(app, token, nome);
    }
    await criarLista(app, bruna.token, "Cores");

    const primeira = await request(app).get("/listas?porPagina=2").set(comLogin(token));
    const segunda = await request(app).get("/listas?pagina=2&porPagina=2").set(comLogin(token));

    expect(primeira.status).toBe(200);
    expect(primeira.body).toMatchObject({ pagina: 1, porPagina: 2, total: 3, totalDePaginas: 2 });
    expect(primeira.body.itens.map((lista: { nome: string }) => lista.nome)).toEqual(["Animais", "Frutas"]);
    expect(segunda.body.itens.map((lista: { nome: string }) => lista.nome)).toEqual(["Países"]);
  });

  it("usa 10 por página quando nada é pedido", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).get("/listas").set(comLogin(token));

    expect(resposta.body).toEqual({ itens: [], pagina: 1, porPagina: 10, total: 0, totalDePaginas: 0 });
  });

  it("recusa uma página inválida", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).get("/listas?pagina=0").set(comLogin(token));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.pagina).toBe("A página precisa ser um número inteiro a partir de 1.");
  });
});

describe("GET /listas/:id", () => {
  it("mostra uma lista da pessoa", async () => {
    const { app, token } = await appComLogin();
    const id = await criarLista(app, token, "Frutas");

    const resposta = await request(app).get(`/listas/${id}`).set(comLogin(token));

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id, nome: "Frutas" });
  });

  it("não mostra a lista de outra pessoa", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    const id = await criarLista(app, bruna.token, "Cores");

    const resposta = await request(app).get(`/listas/${id}`).set(comLogin(token));

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toBe("Essa lista é de outra pessoa.");
  });

  it.each([
    ["uma lista que não existe", "/listas/999", 404, "Lista não encontrada."],
    ["um id que não é número", "/listas/abc", 400, "Confira os campos destacados."],
  ])("responde a %s", async (_caso, caminho, status, mensagem) => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).get(caminho).set(comLogin(token));

    expect(resposta.status).toBe(status);
    expect(resposta.body.mensagem).toBe(mensagem);
  });
});

describe("PUT /listas/:id", () => {
  it("troca o nome da lista", async () => {
    const { app, token } = await appComLogin();
    const id = await criarLista(app, token, "Frutas");

    const resposta = await request(app).put(`/listas/${id}`).set(comLogin(token)).send({ nome: "Frutas do Brasil" });
    const depois = await request(app).get(`/listas/${id}`).set(comLogin(token));

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id, nome: "Frutas do Brasil" });
    expect(depois.body.nome).toBe("Frutas do Brasil");
  });

  it("deixa salvar com o mesmo nome", async () => {
    const { app, token } = await appComLogin();
    const id = await criarLista(app, token, "Frutas");

    const resposta = await request(app).put(`/listas/${id}`).set(comLogin(token)).send({ nome: "FRUTAS" });

    expect(resposta.status).toBe(200);
  });

  it("recusa o nome de outra lista da pessoa", async () => {
    const { app, token } = await appComLogin();
    const id = await criarLista(app, token, "Frutas");
    await criarLista(app, token, "Animais");

    const resposta = await request(app).put(`/listas/${id}`).set(comLogin(token)).send({ nome: "Animais" });

    expect(resposta.status).toBe(409);
  });

  it("não edita a lista de outra pessoa", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    const id = await criarLista(app, bruna.token, "Cores");

    const resposta = await request(app).put(`/listas/${id}`).set(comLogin(token)).send({ nome: "Minha agora" });
    const daBruna = await request(app).get(`/listas/${id}`).set(comLogin(bruna.token));

    expect(resposta.status).toBe(403);
    expect(daBruna.body.nome).toBe("Cores");
  });

  it("não edita uma lista que não existe", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).put("/listas/999").set(comLogin(token)).send({ nome: "Frutas" });

    expect(resposta.status).toBe(404);
  });
});

describe("DELETE /listas/:id", () => {
  it("apaga a lista", async () => {
    const { app, token } = await appComLogin();
    const id = await criarLista(app, token, "Frutas");

    const resposta = await request(app).delete(`/listas/${id}`).set(comLogin(token));
    const depois = await request(app).get(`/listas/${id}`).set(comLogin(token));

    expect(resposta.status).toBe(204);
    expect(depois.status).toBe(404);
  });

  it("não apaga a lista de outra pessoa", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    const id = await criarLista(app, bruna.token, "Cores");

    const resposta = await request(app).delete(`/listas/${id}`).set(comLogin(token));
    const daBruna = await request(app).get(`/listas/${id}`).set(comLogin(bruna.token));

    expect(resposta.status).toBe(403);
    expect(daBruna.status).toBe(200);
  });

  it("não apaga uma lista que não existe", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).delete("/listas/999").set(comLogin(token));

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem).toBe("Lista não encontrada.");
  });
});
