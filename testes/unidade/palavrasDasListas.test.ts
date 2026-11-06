import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { BRUNA, criarAppTeste } from "../apoio/criarAppTeste.js";
import { comLogin, entrar } from "../apoio/sessao.js";

async function criarLista(app: Express, token: string, nome = "Frutas"): Promise<number> {
  const resposta = await request(app).post("/listas").set(comLogin(token)).send({ nome });
  return resposta.body.id;
}

function criarPalavra(app: Express, token: string, listaId: number, corpo: object) {
  return request(app).post(`/listas/${listaId}/palavras`).set(comLogin(token)).send(corpo);
}

async function appComLista() {
  const { app } = criarAppTeste();
  const { token } = await entrar(app);
  return { app, token, listaId: await criarLista(app, token) };
}

describe("rotas de palavras sem login", () => {
  it.each([
    ["get", "/listas/1/palavras"],
    ["get", "/listas/1/palavras/1"],
    ["post", "/listas/1/palavras"],
    ["put", "/listas/1/palavras/1"],
    ["delete", "/listas/1/palavras/1"],
  ] as const)("%s %s pede login", async (metodo, caminho) => {
    const { app } = criarAppTeste();

    const resposta = await request(app)[metodo](caminho).send({ palavra: "UVA" });

    expect(resposta.status).toBe(401);
  });
});

describe("POST /listas/:listaId/palavras", () => {
  it("guarda a palavra em maiúsculas, com a dica, e a lista passa a contar com ela", async () => {
    const { app, token, listaId } = await appComLista();

    const resposta = await criarPalavra(app, token, listaId, { palavra: "  pão   de queijo ", dica: " vem de  Minas " });
    const lista = await request(app).get(`/listas/${listaId}`).set(comLogin(token));

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ id: expect.any(Number), listaId, palavra: "PÃO DE QUEIJO", dica: "vem de Minas" });
    expect(lista.body.totalDePalavras).toBe(1);
  });

  it.each([undefined, null, "   "])("aceita palavra sem dica (%s)", async (dica) => {
    const { app, token, listaId } = await appComLista();

    const resposta = await criarPalavra(app, token, listaId, { palavra: "uva", dica });

    expect(resposta.status).toBe(201);
    expect(resposta.body.dica).toBeNull();
  });

  it.each([
    ["sem palavra", {}, "palavra", "Informe a palavra."],
    ["palavra curta", { palavra: "pé" }, "palavra", "A palavra precisa ter de 3 a 30 letras."],
    ["palavra longa", { palavra: "A".repeat(31) }, "palavra", "A palavra precisa ter de 3 a 30 letras."],
    ["número", { palavra: "pão2" }, "palavra", "Use só letras, com espaço ou hífen entre as partes."],
    ["hífen sobrando", { palavra: "guarda-" }, "palavra", "Use só letras, com espaço ou hífen entre as partes."],
    ["dica curta", { palavra: "uva", dica: "a" }, "dica", "A dica precisa ter de 2 a 80 caracteres."],
    ["dica que não é texto", { palavra: "uva", dica: 7 }, "dica", "Envie a dica como texto."],
  ])("recusa %s", async (_caso, corpo, campo, mensagem) => {
    const { app, token, listaId } = await appComLista();

    const resposta = await criarPalavra(app, token, listaId, corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBe(mensagem);
  });

  it("recusa a mesma palavra duas vezes na lista, mesmo sem os acentos", async () => {
    const { app, token, listaId } = await appComLista();
    await criarPalavra(app, token, listaId, { palavra: "maçã" });

    const resposta = await criarPalavra(app, token, listaId, { palavra: "MACA" });

    expect(resposta.status).toBe(409);
    expect(resposta.body.campos.palavra).toBe("Essa palavra já está na lista.");
  });

  it("deixa a mesma palavra em outra lista", async () => {
    const { app, token, listaId } = await appComLista();
    const outra = await criarLista(app, token, "Comidas");
    await criarPalavra(app, token, listaId, { palavra: "maçã" });

    const resposta = await criarPalavra(app, token, outra, { palavra: "maçã" });

    expect(resposta.status).toBe(201);
  });

  it("não põe palavra na lista de outra pessoa", async () => {
    const { app, token } = await appComLista();
    const bruna = await entrar(app, BRUNA);
    const daBruna = await criarLista(app, bruna.token, "Cores");

    const resposta = await criarPalavra(app, token, daBruna, { palavra: "AZUL" });

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toBe("Essa lista é de outra pessoa.");
  });

  it("não põe palavra numa lista que não existe", async () => {
    const { app, token } = await appComLista();

    const resposta = await criarPalavra(app, token, 999, { palavra: "UVA" });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem).toBe("Lista não encontrada.");
  });
});

describe("GET /listas/:listaId/palavras", () => {
  it("mostra as palavras da lista em ordem alfabética e em páginas", async () => {
    const { app, token, listaId } = await appComLista();
    const outra = await criarLista(app, token, "Comidas");
    for (const palavra of ["UVA", "ABACAXI", "MAÇÃ"]) {
      await criarPalavra(app, token, listaId, { palavra });
    }
    await criarPalavra(app, token, outra, { palavra: "ARROZ" });

    const primeira = await request(app).get(`/listas/${listaId}/palavras?porPagina=2`).set(comLogin(token));
    const segunda = await request(app).get(`/listas/${listaId}/palavras?pagina=2&porPagina=2`).set(comLogin(token));

    expect(primeira.status).toBe(200);
    expect(primeira.body).toMatchObject({ total: 3, totalDePaginas: 2 });
    expect(primeira.body.itens.map((item: { palavra: string }) => item.palavra)).toEqual(["ABACAXI", "MAÇÃ"]);
    expect(segunda.body.itens.map((item: { palavra: string }) => item.palavra)).toEqual(["UVA"]);
  });

  it("não mostra as palavras da lista de outra pessoa", async () => {
    const { app, token } = await appComLista();
    const bruna = await entrar(app, BRUNA);
    const daBruna = await criarLista(app, bruna.token, "Cores");

    const resposta = await request(app).get(`/listas/${daBruna}/palavras`).set(comLogin(token));

    expect(resposta.status).toBe(403);
  });
});

describe("GET, PUT e DELETE /listas/:listaId/palavras/:id", () => {
  it("mostra, edita e apaga uma palavra", async () => {
    const { app, token, listaId } = await appComLista();
    const criada = await criarPalavra(app, token, listaId, { palavra: "UVA", dica: "Dá em cacho" });
    const caminho = `/listas/${listaId}/palavras/${criada.body.id}`;

    const vista = await request(app).get(caminho).set(comLogin(token));
    const editada = await request(app).put(caminho).set(comLogin(token)).send({ palavra: "uva passa", dica: null });
    const apagada = await request(app).delete(caminho).set(comLogin(token));
    const depois = await request(app).get(caminho).set(comLogin(token));

    expect(vista.body).toEqual({ id: criada.body.id, listaId, palavra: "UVA", dica: "Dá em cacho" });
    expect(editada.status).toBe(200);
    expect(editada.body).toEqual({ id: criada.body.id, listaId, palavra: "UVA PASSA", dica: null });
    expect(apagada.status).toBe(204);
    expect(depois.status).toBe(404);
  });

  it("não troca uma palavra por outra que já está na lista", async () => {
    const { app, token, listaId } = await appComLista();
    const uva = await criarPalavra(app, token, listaId, { palavra: "UVA" });
    await criarPalavra(app, token, listaId, { palavra: "MAÇÃ" });

    const resposta = await request(app)
      .put(`/listas/${listaId}/palavras/${uva.body.id}`)
      .set(comLogin(token))
      .send({ palavra: "maca" });

    expect(resposta.status).toBe(409);
  });

  it.each(["get", "put", "delete"] as const)("%s não acha a palavra pedida por outra lista da pessoa", async (metodo) => {
    const { app, token, listaId } = await appComLista();
    const outra = await criarLista(app, token, "Comidas");
    const uva = await criarPalavra(app, token, listaId, { palavra: "UVA" });

    const resposta = await request(app)[metodo](`/listas/${outra}/palavras/${uva.body.id}`).set(comLogin(token)).send({ palavra: "PERA" });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem).toBe("Palavra não encontrada nesta lista.");
  });

  it.each(["get", "put", "delete"] as const)("%s não mexe na palavra da lista de outra pessoa", async (metodo) => {
    const { app, token } = await appComLista();
    const bruna = await entrar(app, BRUNA);
    const daBruna = await criarLista(app, bruna.token, "Cores");
    const azul = await criarPalavra(app, bruna.token, daBruna, { palavra: "AZUL" });

    const resposta = await request(app)[metodo](`/listas/${daBruna}/palavras/${azul.body.id}`).set(comLogin(token)).send({ palavra: "VERDE" });
    const daBrunaDepois = await request(app).get(`/listas/${daBruna}/palavras/${azul.body.id}`).set(comLogin(bruna.token));

    expect(resposta.status).toBe(403);
    expect(daBrunaDepois.body.palavra).toBe("AZUL");
  });

  it.each(["get", "put", "delete"] as const)("%s responde 404 para uma palavra que não existe", async (metodo) => {
    const { app, token, listaId } = await appComLista();

    const resposta = await request(app)[metodo](`/listas/${listaId}/palavras/999`).set(comLogin(token)).send({ palavra: "PERA" });

    expect(resposta.status).toBe(404);
  });

  it("recusa um id de palavra que não é número", async () => {
    const { app, token, listaId } = await appComLista();

    const resposta = await request(app).get(`/listas/${listaId}/palavras/abc`).set(comLogin(token));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.id).toBe("Palavra inválida.");
  });
});
