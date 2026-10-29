import request from "supertest";
import { describe, expect, it } from "vitest";
import { criarAppTeste, LARISSA } from "../apoio/criarAppTeste.js";

describe("POST /usuarios", () => {
  it("cadastra e devolve só id, nome e e-mail", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/usuarios").send(LARISSA);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ id: 1, nome: "Larissa Souza", email: "larissa@exemplo.com" });
  });

  it("guarda nome sem espaços sobrando, e-mail em minúsculas, CPF só com dígitos e senha como hash", async () => {
    const { app, usuarios } = criarAppTeste();

    await request(app)
      .post("/usuarios")
      .send({ ...LARISSA, nome: "  Larissa    Souza ", email: "LARISSA@Exemplo.com" });

    const registro = usuarios.registros[0];
    expect(registro?.nome).toBe("Larissa Souza");
    expect(registro?.email).toBe("larissa@exemplo.com");
    expect(registro?.cpf).toBe("52998224725");
    expect(registro?.senhaHash).toMatch(/^\$2b\$12\$/);
    expect(registro?.senhaHash).not.toContain(LARISSA.senha);
  });

  it("diz em português qual campo obrigatório faltou", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/usuarios").send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      mensagem: "Confira os campos destacados.",
      campos: {
        nome: "Informe o nome.",
        email: "Informe o e-mail.",
        cpf: "Informe o CPF.",
        senha: "Informe a senha.",
      },
    });
  });

  it("recusa CPF com dígito verificador errado", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/usuarios").send({ ...LARISSA, cpf: "529.982.247-24" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ cpf: "CPF inválido. Confira os 11 números." });
  });

  it("recusa senha fraca dizendo o que falta", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/usuarios").send({ ...LARISSA, senha: "hangdle2026" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({
      senha: "A senha precisa ter: uma letra maiúscula, um símbolo, como ! @ # $ %.",
    });
  });

  it("recusa e-mail inválido", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).post("/usuarios").send({ ...LARISSA, email: "larissa@exemplo" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ email: "Digite um e-mail válido, como nome@exemplo.com." });
  });

  it("recusa e-mail repetido mesmo com maiúsculas diferentes", async () => {
    const { app } = criarAppTeste();
    await request(app).post("/usuarios").send(LARISSA);

    const resposta = await request(app)
      .post("/usuarios")
      .send({ ...LARISSA, email: "Larissa@Exemplo.com", cpf: "111.444.777-35" });

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({
      mensagem: "Este e-mail já está cadastrado.",
      campos: { email: "Este e-mail já está cadastrado." },
    });
  });

  it("recusa CPF repetido mesmo escrito sem pontuação", async () => {
    const { app } = criarAppTeste();
    await request(app).post("/usuarios").send(LARISSA);

    const resposta = await request(app)
      .post("/usuarios")
      .send({ ...LARISSA, email: "outra@exemplo.com", cpf: "52998224725" });

    expect(resposta.status).toBe(409);
    expect(resposta.body.campos).toEqual({ cpf: "Este CPF já está cadastrado." });
  });
});
