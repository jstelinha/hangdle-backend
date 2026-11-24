import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { exigirLogin, usuarioLogado } from "../../src/middlewares/exigirLogin.js";
import { tratarErros } from "../../src/middlewares/tratarErros.js";
import { criarAppTeste, LARISSA, SEGREDO_TESTE } from "../apoio/criarAppTeste.js";

function appProtegido() {
  const app = express();
  app.get("/protegida", exigirLogin(SEGREDO_TESTE), (_requisicao, resposta) => {
    resposta.json({ usuarioId: usuarioLogado(resposta) });
  });
  app.use(tratarErros);
  return app;
}

function chamarCom(cabecalho?: string) {
  const chamada = request(appProtegido()).get("/protegida");
  return cabecalho ? chamada.set("Authorization", cabecalho) : chamada;
}

function base64url(conteudo: object): string {
  return Buffer.from(JSON.stringify(conteudo)).toString("base64url");
}

describe("rota que exige login", () => {
  it("aceita o token que o próprio login devolve", async () => {
    const { app } = criarAppTeste();
    await request(app).post("/usuarios").send(LARISSA);
    const login = await request(app).post("/login").send({ email: LARISSA.email, senha: LARISSA.senha });

    const resposta = await chamarCom(`Bearer ${login.body.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ usuarioId: 1 });
  });

  it.each([
    ["sem token", undefined],
    ["com outro tipo de cabeçalho", "Basic bGFyaXNzYTpzZW5oYQ=="],
    ["com token assinado por outro segredo", `Bearer ${jwt.sign({}, "outro-segredo-com-mais-de-32-caracteres!!", { subject: "1" })}`],
    ["com token sem assinatura", `Bearer ${base64url({ alg: "none", typ: "JWT" })}.${base64url({ sub: "1" })}.`],
    ["com token sem id de usuário", `Bearer ${jwt.sign({ nome: "Larissa" }, SEGREDO_TESTE)}`],
  ])("recusa a chamada %s", async (_caso, cabecalho) => {
    const resposta = await chamarCom(cabecalho);

    expect(resposta.status).toBe(401);
    expect(resposta.body.mensagem).toBe("Entre na sua conta para continuar.");
  });

  it("avisa quando a sessão expirou", async () => {
    const vencido = jwt.sign({}, SEGREDO_TESTE, { subject: "1", expiresIn: -10 });

    const resposta = await chamarCom(`Bearer ${vencido}`);

    expect(resposta.status).toBe(401);
    expect(resposta.body.mensagem).toBe("Sua sessão expirou. Entre de novo.");
  });
});
