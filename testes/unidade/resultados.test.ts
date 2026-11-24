import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { diaAnterior } from "../../src/dominio/dia.js";
import { BRUNA, criarAppTeste, LARISSA } from "../apoio/criarAppTeste.js";

type Pessoa = typeof LARISSA;

async function entrar(app: Express, pessoa: Pessoa = LARISSA): Promise<string> {
  await request(app).post("/usuarios").send(pessoa);
  const login = await request(app).post("/login").send({ email: pessoa.email, senha: pessoa.senha });
  return login.body.token;
}

function salvar(app: Express, token: string, corpo: object) {
  return request(app).post("/resultados").set("Authorization", `Bearer ${token}`).send(corpo);
}

function historico(app: Express, token: string, consulta = "") {
  return request(app).get(`/resultados${consulta}`).set("Authorization", `Bearer ${token}`);
}

async function appComPalavraDeHoje() {
  const contexto = criarAppTeste();
  await request(contexto.app).get("/palavra-do-dia");
  return { ...contexto, token: await entrar(contexto.app) };
}

describe("diaAnterior", () => {
  it("volta um dia, inclusive na virada do mês e do ano", () => {
    expect(diaAnterior("2026-11-03")).toBe("2026-11-02");
    expect(diaAnterior("2026-03-01")).toBe("2026-02-28");
    expect(diaAnterior("2027-01-01")).toBe("2026-12-31");
  });
});

describe("POST /resultados", () => {
  it("exige login", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/resultados").send({ dia: "2026-11-03", letras: ["M"] });

    expect(resposta.status).toBe(401);
  });

  it("refaz a partida e devolve o resultado calculado pelo back", async () => {
    const { app, token } = await appComPalavraDeHoje();

    const resposta = await salvar(app, token, { dia: "2026-11-03", letras: ["z", "m", "a", "c"] });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({
      dia: "2026-11-03",
      palavra: "MAÇÃ",
      categoria: "Comida",
      letras: ["Z", "M", "A", "C"],
      chutes: 4,
      erros: 1,
      acertou: true,
    });
  });

  it("guarda também quem perdeu", async () => {
    const { app, token } = await appComPalavraDeHoje();

    const resposta = await salvar(app, token, { dia: "2026-11-03", letras: [..."ZWYKLB"] });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ acertou: false, erros: 6, chutes: 6 });
  });

  it("não deixa salvar duas vezes o mesmo dia", async () => {
    const { app, token } = await appComPalavraDeHoje();
    await salvar(app, token, { dia: "2026-11-03", letras: ["M", "A", "C"] });

    const resposta = await salvar(app, token, { dia: "2026-11-03", letras: [..."ZWYKLB"] });

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("Você já jogou a palavra deste dia.");
  });

  it.each([
    ["partida que não terminou", { dia: "2026-11-03", letras: ["M", "A"] }, "letras", "A partida ainda não terminou."],
    ["letras depois do acerto", { dia: "2026-11-03", letras: ["M", "A", "C", "Z"] }, "letras", "Há letras depois do fim da partida."],
    ["mais de uma letra por chute", { dia: "2026-11-03", letras: ["MA", "C"] }, "letras", "Envie uma letra por vez, de A a Z."],
    ["dia em outro formato", { dia: "03/11/2026", letras: ["M", "A", "C"] }, "dia", "Envie o dia no formato AAAA-MM-DD."],
    ["dia de anteontem", { dia: "2026-11-01", letras: ["M", "A", "C"] }, "dia", "Só dá para salvar o resultado de hoje ou de ontem."],
    ["ontem, que não teve palavra", { dia: "2026-11-02", letras: ["M", "A", "C"] }, "dia", "Não houve palavra do dia nessa data."],
  ])("recusa %s", async (_caso, corpo, campo, mensagem) => {
    const { app, token } = await appComPalavraDeHoje();

    const resposta = await salvar(app, token, corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBe(mensagem);
  });

  it("aceita o resultado de ontem logo depois da meia-noite", async () => {
    const instante = { atual: new Date("2026-11-03T23:59:00-03:00") };
    const { app } = criarAppTeste({ agora: () => instante.atual });
    await request(app).get("/palavra-do-dia");
    const token = await entrar(app);
    instante.atual = new Date("2026-11-04T00:05:00-03:00");

    const resposta = await salvar(app, token, { dia: "2026-11-03", letras: ["M", "A", "C"] });

    expect(resposta.status).toBe(201);
  });
});

describe("GET /resultados", () => {
  it("exige login", async () => {
    const { app } = criarAppTeste();

    expect((await request(app).get("/resultados")).status).toBe(401);
  });

  it("mostra só os resultados de quem está logado", async () => {
    const { app, token } = await appComPalavraDeHoje();
    const tokenDaBruna = await entrar(app, BRUNA);
    await salvar(app, token, { dia: "2026-11-03", letras: ["M", "A", "C"] });

    const daLarissa = await historico(app, token);
    const daBruna = await historico(app, tokenDaBruna);

    expect(daLarissa.body.resultados).toHaveLength(1);
    expect(daLarissa.body.resultados[0]).toMatchObject({ dia: "2026-11-03", acertou: true });
    expect(daBruna.body.resultados).toEqual([]);
  });

  it("filtra por dia", async () => {
    const { app, token } = await appComPalavraDeHoje();
    await salvar(app, token, { dia: "2026-11-03", letras: ["M", "A", "C"] });

    const deHoje = await historico(app, token, "?dia=2026-11-03");
    const deOntem = await historico(app, token, "?dia=2026-11-02");

    expect(deHoje.body.resultados).toHaveLength(1);
    expect(deOntem.body.resultados).toEqual([]);
  });
});
