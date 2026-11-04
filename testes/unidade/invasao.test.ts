import request from "supertest";
import { describe, expect, it } from "vitest";
import { criarAppTeste, LARISSA } from "../apoio/criarAppTeste.js";

describe("ataques contra cadastro e login", () => {
  it.each(["' OR '1'='1", "larissa@exemplo.com' OR 1=1 -- ", "x@x.com; DROP TABLE usuarios"])(
    "recusa injeção de SQL no e-mail do login: %s",
    async (email) => {
      const { app } = criarAppTeste();
      await request(app).post("/usuarios").send(LARISSA);

      const resposta = await request(app).post("/login").send({ email, senha: LARISSA.senha });

      expect(resposta.status).toBe(400);
      expect(resposta.body.token).toBeUndefined();
    },
  );

  it("ignora id e hash de senha enviados no cadastro", async () => {
    const { app, usuarios } = criarAppTeste();
    const hashDoAtacante = "$2b$12$abcdefghijklmnopqrstuuMRjZ7c0Y3x5r4H9Fh7wJxX2nXxXxXxX";

    const resposta = await request(app)
      .post("/usuarios")
      .send({ ...LARISSA, id: 999, senhaHash: hashDoAtacante, senha_hash: hashDoAtacante, admin: true });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ id: 1, nome: "Larissa Souza", email: "larissa@exemplo.com" });
    expect(usuarios.registros[0]?.senhaHash).not.toBe(hashDoAtacante);
    const login = await request(app).post("/login").send({ email: LARISSA.email, senha: LARISSA.senha });
    expect(login.status).toBe(200);
  });

  it("não deixa __proto__ no corpo contaminar os objetos do servidor", async () => {
    const { app } = criarAppTeste();

    await request(app)
      .post("/usuarios")
      .set("Content-Type", "application/json")
      .send(`{"__proto__":{"admin":true},"nome":"Larissa Souza","email":"larissa@exemplo.com","cpf":"529.982.247-25","senha":"Hangdle#2026"}`);

    expect(({} as Record<string, unknown>)["admin"]).toBeUndefined();
  });

  it.each([
    ["senha como lista", { email: LARISSA.email, senha: [LARISSA.senha] }, "senha"],
    ["e-mail como objeto de consulta", { email: { $gt: "" }, senha: LARISSA.senha }, "email"],
    ["senha como número", { email: LARISSA.email, senha: 12345678 }, "senha"],
  ])("recusa %s no login", async (_caso, corpo, campo) => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/login").send(corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBe("Envie este campo como texto.");
  });

  it("responde em português quando o JSON está quebrado", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/login").set("Content-Type", "application/json").send('{"email": ');

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ mensagem: "Os dados enviados não estão em JSON válido." });
  });

  it("recusa corpo sem JSON", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/usuarios").set("Content-Type", "text/plain").send("nome=Larissa");

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ mensagem: "Envie os dados do formulário em JSON.", campos: {} });
  });

  it("recusa corpo maior que 10 kB", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app)
      .post("/usuarios")
      .send({ ...LARISSA, nome: "a".repeat(11 * 1024) });

    expect(resposta.status).toBe(413);
    expect(resposta.body).toEqual({ mensagem: "Os dados enviados são grandes demais." });
  });

  it("bloqueia a quarta tentativa de login seguida quando o limite é 3", async () => {
    const { app } = criarAppTeste({ tentativasPorJanela: 3 });
    const tentativa = () => request(app).post("/login").send({ email: LARISSA.email, senha: "Errada#2026" });

    await tentativa();
    await tentativa();
    await tentativa();
    const quarta = await tentativa();

    expect(quarta.status).toBe(429);
    expect(quarta.body).toEqual({ mensagem: "Muitas tentativas seguidas. Espere 15 minutos e tente de novo." });
  });

  it("login certo não gasta tentativa", async () => {
    const { app } = criarAppTeste({ tentativasPorJanela: 2 });
    await request(app).post("/usuarios").send(LARISSA);
    const entrar = () => request(app).post("/login").send({ email: LARISSA.email, senha: LARISSA.senha });

    const respostas = [await entrar(), await entrar(), await entrar()];

    expect(respostas.map((resposta) => resposta.status)).toEqual([200, 200, 200]);
  });

  it("cadastro não gasta as tentativas do login", async () => {
    const { app } = criarAppTeste({ tentativasPorJanela: 1 });
    await request(app).post("/usuarios").send(LARISSA);

    const login = await request(app).post("/login").send({ email: LARISSA.email, senha: "Errada#2026" });

    expect(login.status).toBe(401);
  });

  it("atrás do nginx, cada pessoa tem o próprio limite de tentativas", async () => {
    const { app } = criarAppTeste({ tentativasPorJanela: 1 });
    const tentativaDe = (ip: string) =>
      request(app).post("/login").set("X-Forwarded-For", ip).send({ email: LARISSA.email, senha: "Errada#2026" });

    await tentativaDe("203.0.113.10");
    const segundaDaMesmaPessoa = await tentativaDe("203.0.113.10");
    const primeiraDeOutraPessoa = await tentativaDe("203.0.113.20");

    expect(segundaDaMesmaPessoa.status).toBe(429);
    expect(primeiraDeOutraPessoa.status).toBe(401);
  });

  it("não deixa escapar do limite inventando um IP no X-Forwarded-For", async () => {
    const { app } = criarAppTeste({ tentativasPorJanela: 1 });
    const tentativaComIpInventado = (inventado: string) =>
      request(app)
        .post("/login")
        .set("X-Forwarded-For", `${inventado}, 203.0.113.10`)
        .send({ email: LARISSA.email, senha: "Errada#2026" });

    await tentativaComIpInventado("198.51.100.1");
    const segunda = await tentativaComIpInventado("198.51.100.2");

    expect(segunda.status).toBe(429);
  });

  it("só libera CORS para as origens configuradas", async () => {
    const { app } = criarAppTeste();

    const permitida = await request(app).post("/login").set("Origin", "http://localhost").send({});
    const estranha = await request(app).post("/login").set("Origin", "http://site-malicioso.com").send({});

    expect(permitida.headers["access-control-allow-origin"]).toBe("http://localhost");
    expect(estranha.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("não anuncia que o servidor é Express", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).get("/saude");

    expect(resposta.headers["x-powered-by"]).toBeUndefined();
  });

  it.each([
    ["nome só com números", { nome: "123" }, "nome"],
    ["nome com 101 caracteres", { nome: "a".repeat(101) }, "nome"],
    ["CPF com letra no meio", { cpf: "529.982.2a7-25" }, "cpf"],
  ])("recusa %s no cadastro", async (_caso, troca, campo) => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/usuarios").send({ ...LARISSA, ...troca });

    expect(resposta.status).toBe(400);
    expect(Object.keys(resposta.body.campos)).toEqual([campo]);
  });
});
