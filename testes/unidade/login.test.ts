import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { criarAppTeste, LARISSA, SEGREDO_TESTE } from "../apoio/criarAppTeste.js";

async function appComLarissa() {
  const contexto = criarAppTeste();
  await request(contexto.app).post("/usuarios").send(LARISSA);
  return contexto;
}

describe("POST /login", () => {
  it("devolve um JWT assinado com o id do usuário e os dados públicos", async () => {
    const { app } = await appComLarissa();

    const resposta = await request(app).post("/login").send({ email: LARISSA.email, senha: LARISSA.senha });

    expect(resposta.status).toBe(200);
    expect(resposta.body.usuario).toEqual({ id: 1, nome: "Larissa Souza", email: "larissa@exemplo.com" });
    const conteudo = jwt.verify(resposta.body.token, SEGREDO_TESTE, { algorithms: ["HS256"] });
    expect(conteudo).toMatchObject({ sub: "1", nome: "Larissa Souza" });
  });

  it("aceita o e-mail com maiúsculas", async () => {
    const { app } = await appComLarissa();

    const resposta = await request(app).post("/login").send({ email: "LARISSA@EXEMPLO.COM", senha: LARISSA.senha });

    expect(resposta.status).toBe(200);
  });

  it("recusa senha errada", async () => {
    const { app } = await appComLarissa();

    const resposta = await request(app).post("/login").send({ email: LARISSA.email, senha: "Hangdle#2025" });

    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual({ mensagem: "E-mail ou senha incorretos.", campos: {} });
  });

  it("recusa usuário que não existe com a mesma resposta da senha errada", async () => {
    const { app } = await appComLarissa();

    const resposta = await request(app).post("/login").send({ email: "ninguem@exemplo.com", senha: LARISSA.senha });

    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual({ mensagem: "E-mail ou senha incorretos.", campos: {} });
  });

  it("valida o formato do e-mail antes de procurar o usuário", async () => {
    const { app } = await appComLarissa();

    const resposta = await request(app).post("/login").send({ email: "larissa", senha: LARISSA.senha });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ email: "Digite um e-mail válido, como nome@exemplo.com." });
  });
});
