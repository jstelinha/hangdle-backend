import request from "supertest";
import { describe, expect, it } from "vitest";
import { diaNoFuso } from "../../src/dominio/dia.js";
import { ErroIndisponivel } from "../../src/erros/ErroAplicacao.js";
import { ServicoPalavraDoDia } from "../../src/servicos/ServicoPalavraDoDia.js";
import { criarAppTeste } from "../apoio/criarAppTeste.js";
import { RepositorioPalavrasDoDiaMemoria, type PalavraCadastrada } from "../apoio/RepositorioPalavrasDoDiaMemoria.js";

const MACA: PalavraCadastrada = { palavra: "MAÇÃ", categoria: "Comida" };
const ARARA: PalavraCadastrada = { palavra: "ARARA", categoria: "Animais" };

function servicoEm(instante: { atual: Date }, palavras: PalavraCadastrada[] = [MACA, ARARA]) {
  return new ServicoPalavraDoDia(new RepositorioPalavrasDoDiaMemoria(palavras), () => instante.atual);
}

describe("dia do jogo", () => {
  it("segue o horário de Brasília, e não o de Londres", () => {
    expect(diaNoFuso(new Date("2026-11-04T02:59:00Z"))).toBe("2026-11-03");
    expect(diaNoFuso(new Date("2026-11-04T03:00:00Z"))).toBe("2026-11-04");
  });
});

describe("palavra do dia", () => {
  it("é a mesma o dia inteiro", async () => {
    const instante = { atual: new Date("2026-11-03T08:00:00-03:00") };
    const servico = servicoEm(instante);

    const manha = await servico.deHoje();
    instante.atual = new Date("2026-11-03T23:59:00-03:00");
    const noite = await servico.deHoje();

    expect(noite).toEqual(manha);
    expect(manha.dia).toBe("2026-11-03");
  });

  it("troca à meia-noite e não repete enquanto houver palavra que nunca saiu", async () => {
    const instante = { atual: new Date("2026-11-03T12:00:00-03:00") };
    const servico = servicoEm(instante);

    const hoje = await servico.deHoje();
    instante.atual = new Date("2026-11-04T00:00:00-03:00");
    const amanha = await servico.deHoje();

    expect(amanha.dia).toBe("2026-11-04");
    expect(amanha.palavra).not.toBe(hoje.palavra);
  });

  it("quando todas já saíram, volta a que saiu há mais tempo", async () => {
    const instante = { atual: new Date("2026-11-03T12:00:00-03:00") };
    const servico = servicoEm(instante);

    const primeiro = await servico.deHoje();
    instante.atual = new Date("2026-11-04T12:00:00-03:00");
    await servico.deHoje();
    instante.atual = new Date("2026-11-05T12:00:00-03:00");
    const terceiro = await servico.deHoje();

    expect(terceiro.palavra).toBe(primeiro.palavra);
  });

  it("avisa quando não há palavras cadastradas", async () => {
    const servico = servicoEm({ atual: new Date() }, []);

    await expect(servico.deHoje()).rejects.toBeInstanceOf(ErroIndisponivel);
  });
});

describe("GET /palavra-do-dia", () => {
  it("devolve o dia, a palavra e a categoria", async () => {
    const { app } = criarAppTeste({ agora: () => new Date("2026-11-03T12:00:00-03:00") });

    const resposta = await request(app).get("/palavra-do-dia");

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ dia: "2026-11-03", palavra: "MAÇÃ", categoria: "Comida" });
  });

  it("responde 503 em português quando não há palavras", async () => {
    const { app } = criarAppTeste({ palavras: [] });

    const resposta = await request(app).get("/palavra-do-dia");

    expect(resposta.status).toBe(503);
    expect(resposta.body.mensagem).toBe("Ainda não há palavras cadastradas para o jogo.");
  });
});
