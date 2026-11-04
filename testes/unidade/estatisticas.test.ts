import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { resumirDia } from "../../src/dominio/EstatisticasDoDia.js";
import { BRUNA, criarAppTeste, LARISSA } from "../apoio/criarAppTeste.js";

async function jogar(app: Express, pessoa: typeof LARISSA, letras: string[]) {
  await request(app).post("/usuarios").send(pessoa);
  const login = await request(app).post("/login").send({ email: pessoa.email, senha: pessoa.senha });
  await request(app)
    .post("/resultados")
    .set("Authorization", `Bearer ${login.body.token}`)
    .send({ dia: "2026-11-03", letras });
}

describe("resumo do dia", () => {
  it("soma os jogadores e ordena a distribuição por letras", () => {
    const resumo = resumirDia("2026-11-03", [
      { acertou: true, chutes: 7, jogadores: 2 },
      { acertou: false, chutes: 6, jogadores: 3 },
      { acertou: true, chutes: 4, jogadores: 1 },
    ]);

    expect(resumo).toEqual({
      dia: "2026-11-03",
      jogadores: 6,
      naoAcertaram: 3,
      distribuicao: [
        { letras: 4, jogadores: 1 },
        { letras: 7, jogadores: 2 },
      ],
    });
  });
});

describe("GET /palavra-do-dia/estatisticas", () => {
  it("é aberta e mostra como todo mundo foi hoje", async () => {
    const { app } = criarAppTeste();
    await request(app).get("/palavra-do-dia");
    await jogar(app, LARISSA, ["Z", "M", "A", "C"]);
    await jogar(app, BRUNA, [..."ZWYKLB"]);

    const resposta = await request(app).get("/palavra-do-dia/estatisticas");

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      dia: "2026-11-03",
      jogadores: 2,
      naoAcertaram: 1,
      distribuicao: [{ letras: 4, jogadores: 1 }],
    });
  });

  it("dia sem ninguém jogando vem zerado", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).get("/palavra-do-dia/estatisticas?dia=2026-11-01");

    expect(resposta.body).toEqual({ dia: "2026-11-01", jogadores: 0, naoAcertaram: 0, distribuicao: [] });
  });

  it("recusa um dia que ainda não chegou", async () => {
    const { app } = criarAppTeste();

    const resposta = await request(app).get("/palavra-do-dia/estatisticas?dia=2026-11-04");

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.dia).toBe("Esse dia ainda não chegou.");
  });
});
