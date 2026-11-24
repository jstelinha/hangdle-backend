import request from "supertest";
import { describe, expect, it } from "vitest";
import { BRUNA, criarAppTeste } from "../apoio/criarAppTeste.js";
import { LISTAS_PRONTAS_TESTE } from "../apoio/RepositorioListasProntasMemoria.js";
import { comLogin, entrar } from "../apoio/sessao.js";

async function appComLogin(opcoes: Parameters<typeof criarAppTeste>[0] = {}) {
  const { app } = criarAppTeste(opcoes);
  const { id, token } = await entrar(app);
  return { app, usuarioId: id, token };
}

describe("rotas de listas prontas sem login", () => {
  it.each([
    ["get", "/listas-prontas"],
    ["post", "/listas-prontas/1/copias"],
  ] as const)("%s %s pede login", async (metodo, caminho) => {
    const { app } = criarAppTeste();

    const resposta = await request(app)[metodo](caminho);

    expect(resposta.status).toBe(401);
  });
});

describe("GET /listas-prontas", () => {
  it("mostra as listas prontas, em ordem de nome, com quantas palavras cada uma tem", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).get("/listas-prontas").set(comLogin(token));

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      listas: [
        { id: 1, nome: "Animais", totalDePalavras: 3 },
        { id: 2, nome: "Frutas", totalDePalavras: 2 },
      ],
    });
  });
});

describe("POST /listas-prontas/:id/copias", () => {
  it("copia a lista pronta, com as palavras e as dicas, para as listas da pessoa", async () => {
    const { app, token, usuarioId } = await appComLogin();

    const resposta = await request(app).post("/listas-prontas/1/copias").set(comLogin(token));

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ id: expect.any(Number), usuarioId, nome: "Animais", totalDePalavras: 3 });
    const listas = await request(app).get("/listas").set(comLogin(token));
    expect(listas.body.itens).toEqual([{ id: resposta.body.id, usuarioId, nome: "Animais", totalDePalavras: 3 }]);
    const palavras = await request(app).get(`/listas/${resposta.body.id}/palavras`).set(comLogin(token));
    expect(palavras.body.itens.map(({ palavra, dica }: { palavra: string; dica: string | null }) => ({ palavra, dica }))).toEqual(
      LISTAS_PRONTAS_TESTE[0]?.palavras,
    );
  });

  it("a cópia é da pessoa: outra pessoa copia a mesma lista para as listas dela", async () => {
    const { app, token } = await appComLogin();
    const bruna = await entrar(app, BRUNA);
    await request(app).post("/listas-prontas/2/copias").set(comLogin(token));

    const resposta = await request(app).post("/listas-prontas/2/copias").set(comLogin(bruna.token));

    expect(resposta.status).toBe(201);
    expect(resposta.body.usuarioId).toBe(bruna.id);
  });

  it("quem já tem uma lista com o mesmo nome recebe 409, e nada é copiado de novo", async () => {
    const { app, token } = await appComLogin();
    await request(app).post("/listas-prontas/1/copias").set(comLogin(token));

    const resposta = await request(app).post("/listas-prontas/1/copias").set(comLogin(token));

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("Você já tem uma lista com esse nome.");
    const listas = await request(app).get("/listas").set(comLogin(token));
    expect(listas.body.total).toBe(1);
  });

  it("lista pronta que não existe: 404", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).post("/listas-prontas/99/copias").set(comLogin(token));

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem).toBe("Lista pronta não encontrada.");
  });

  it("id que não é número: 400", async () => {
    const { app, token } = await appComLogin();

    const resposta = await request(app).post("/listas-prontas/abc/copias").set(comLogin(token));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.id).toBe("Lista pronta inválida.");
  });

  it("se uma palavra não entra, a lista criada sai: a cópia não fica pela metade", async () => {
    const comRepetida = [
      { id: 1, nome: "Animais", totalDePalavras: 2, palavras: [{ palavra: "ARARA", dica: null }, { palavra: "ARARA", dica: null }] },
    ];
    const { app, token } = await appComLogin({ listasProntas: comRepetida });

    const resposta = await request(app).post("/listas-prontas/1/copias").set(comLogin(token));

    expect(resposta.status).toBe(409);
    const listas = await request(app).get("/listas").set(comLogin(token));
    expect(listas.body.total).toBe(0);
  });
});
