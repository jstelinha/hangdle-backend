import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { BRUNA, criarAppTeste, LARISSA } from "../apoio/criarAppTeste.js";

type Pessoa = typeof LARISSA;

const EDICAO = { nome: "Larissa Andrade", cpf: "111.444.777-35", senha: "Forca#2027" };

async function entrar(app: Express, pessoa: Pessoa = LARISSA): Promise<{ id: number; token: string }> {
  await request(app).post("/usuarios").send(pessoa);
  const login = await request(app).post("/login").send({ email: pessoa.email, senha: pessoa.senha });
  return { id: login.body.usuario.id, token: login.body.token };
}

function editar(app: Express, id: number, token: string, corpo: object) {
  return request(app).put(`/usuarios/${id}`).set("Authorization", `Bearer ${token}`).send(corpo);
}

describe("GET /usuarios/:id", () => {
  it("mostra os dados da própria conta, inclusive o CPF para editar", async () => {
    const { app } = criarAppTeste();
    const { id, token } = await entrar(app);

    const resposta = await request(app).get(`/usuarios/${id}`).set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id, nome: "Larissa Souza", email: "larissa@exemplo.com", cpf: "52998224725" });
  });

  it("não mostra a conta de outra pessoa", async () => {
    const { app } = criarAppTeste();
    const { token } = await entrar(app);
    const bruna = await entrar(app, BRUNA);

    const resposta = await request(app).get(`/usuarios/${bruna.id}`).set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toBe("Você só pode ver e editar a sua própria conta.");
  });

  it("exige login", async () => {
    const { app } = criarAppTeste();

    expect((await request(app).get("/usuarios/1")).status).toBe(401);
  });
});

describe("PUT /usuarios/:id", () => {
  it("edita nome, CPF e senha da própria conta", async () => {
    const { app } = criarAppTeste();
    const { id, token } = await entrar(app);

    const resposta = await editar(app, id, token, EDICAO);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id, nome: "Larissa Andrade", email: "larissa@exemplo.com" });
    const senhaNova = await request(app).post("/login").send({ email: LARISSA.email, senha: EDICAO.senha });
    const senhaVelha = await request(app).post("/login").send({ email: LARISSA.email, senha: LARISSA.senha });
    expect(senhaNova.status).toBe(200);
    expect(senhaVelha.status).toBe(401);
  });

  it("não deixa trocar o e-mail", async () => {
    const { app } = criarAppTeste();
    const { id, token } = await entrar(app);

    const resposta = await editar(app, id, token, { ...EDICAO, email: "outro@exemplo.com" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.email).toBe("O e-mail não pode ser alterado.");
  });

  it("exige todos os campos", async () => {
    const { app } = criarAppTeste();
    const { id, token } = await entrar(app);

    const resposta = await editar(app, id, token, {});

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ nome: "Informe o nome.", cpf: "Informe o CPF.", senha: "Informe a senha." });
  });

  it.each([
    ["CPF inválido", { cpf: "529.982.247-24" }, "cpf", "CPF inválido. Confira os 11 números."],
    ["senha fraca", { senha: "forca2027" }, "senha", "A senha precisa ter: uma letra maiúscula, um símbolo, como ! @ # $ %."],
  ])("recusa %s", async (_caso, troca, campo, mensagem) => {
    const { app } = criarAppTeste();
    const { id, token } = await entrar(app);

    const resposta = await editar(app, id, token, { ...EDICAO, ...troca });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBe(mensagem);
  });

  it("não deixa usar o CPF de outra pessoa", async () => {
    const { app } = criarAppTeste();
    const { id, token } = await entrar(app);
    await entrar(app, BRUNA);

    const resposta = await editar(app, id, token, { ...EDICAO, cpf: BRUNA.cpf });

    expect(resposta.status).toBe(409);
    expect(resposta.body.campos.cpf).toBe("Este CPF já está cadastrado.");
  });

  it("não deixa editar a conta de outra pessoa", async () => {
    const { app } = criarAppTeste();
    const { token } = await entrar(app);
    const bruna = await entrar(app, BRUNA);

    const resposta = await editar(app, bruna.id, token, EDICAO);

    expect(resposta.status).toBe(403);
  });

  it("recusa um id que não é número", async () => {
    const { app } = criarAppTeste();
    const { token } = await entrar(app);

    const resposta = await editar(app, Number.NaN, token, EDICAO);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.id).toBe("Usuário inválido.");
  });
});
