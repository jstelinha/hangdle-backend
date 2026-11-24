import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { diaNoFuso } from "../../src/dominio/dia.js";
import { ErroIndisponivel } from "../../src/erros/ErroAplicacao.js";
import { ServicoPalavraDoDia } from "../../src/servicos/ServicoPalavraDoDia.js";
import { TokenDoJogo } from "../../src/servicos/TokenDoJogo.js";
import { criarAppTeste, LARISSA, SEGREDO_TESTE } from "../apoio/criarAppTeste.js";
import { RepositorioPalavrasDoDiaMemoria, type PalavraCadastrada } from "../apoio/RepositorioPalavrasDoDiaMemoria.js";
import { comLogin, entrar } from "../apoio/sessao.js";

const MACA: PalavraCadastrada = { palavra: "MAÇÃ", categoria: "Comida" };
const ARARA: PalavraCadastrada = { palavra: "ARARA", categoria: "Animais" };

function servicoEm(instante: { atual: Date }, palavras: PalavraCadastrada[] = [MACA, ARARA]) {
  return new ServicoPalavraDoDia(new RepositorioPalavrasDoDiaMemoria(palavras), () => instante.atual, new TokenDoJogo(SEGREDO_TESTE));
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

// MAÇÃ é a primeira palavra do teste: é a que sai no dia 3. Ç abre com C, e Ã, com A.
const DIA_3 = "2026-11-03T12:00:00-03:00";
const CASAS_FECHADAS = [null, null, null, null];

type Jogo = { token: string; palavra: string | null; letras: string[]; [campo: string]: unknown };

function chutar(app: Express, token: string, letra: unknown) {
  return request(app).post("/palavra-do-dia/letras").send({ token, letra });
}

// Joga as letras na ordem, sempre com o token da resposta anterior, como o front.
async function jogar(app: Express, letras: string): Promise<Jogo> {
  let jogo: Jogo = (await request(app).get("/palavra-do-dia")).body;
  for (const letra of letras) {
    const resposta = await chutar(app, jogo.token, letra);
    expect(resposta.status).toBe(200);
    jogo = resposta.body;
  }
  return jogo;
}

// Troca as letras de dentro do token sem refazer a assinatura, como faria quem quer apagar um erro.
function comOutrasLetras(token: string, letras: string[]): string {
  const [corpo, assinatura] = token.split(".");
  const jogadas = JSON.parse(Buffer.from(corpo ?? "", "base64url").toString("utf8"));
  return `${Buffer.from(JSON.stringify({ ...jogadas, letras })).toString("base64url")}.${assinatura}`;
}

describe("GET /palavra-do-dia", () => {
  it("começa a partida do dia sem mostrar a palavra: só a categoria, as casas fechadas e o token", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });

    const resposta = await request(app).get("/palavra-do-dia");

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      dia: "2026-11-03",
      categoria: "Comida",
      casas: CASAS_FECHADAS,
      letras: [],
      erros: 0,
      acertou: false,
      terminou: false,
      palavra: null,
      token: expect.any(String),
    });
    expect(JSON.stringify(resposta.body)).not.toMatch(/MA[CÇ][AÃ]/);
  });

  it("responde 503 em português quando não há palavras", async () => {
    const { app } = criarAppTeste({ palavras: [] });

    const resposta = await request(app).get("/palavra-do-dia");

    expect(resposta.status).toBe(503);
    expect(resposta.body.mensagem).toBe("Ainda não há palavras cadastradas para o jogo.");
  });
});

describe("POST /palavra-do-dia/letras", () => {
  it("sem login, abre as casas da letra certa e conta a errada, sem mostrar a palavra", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });

    const jogo = await jogar(app, "AZ");

    expect(jogo).toMatchObject({ casas: [null, "A", null, "Ã"], letras: ["A", "Z"], erros: 1, terminou: false, palavra: null });
    expect(JSON.stringify(jogo)).not.toMatch(/MA[CÇ][AÃ]/);
  });

  it("mostra a palavra só no fim, quando acerta", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });

    const quase = await jogar(app, "MA");
    const fim = await chutar(app, quase.token, "c");

    expect(quase.palavra).toBeNull();
    expect(fim.body).toMatchObject({ casas: ["M", "A", "Ç", "Ã"], acertou: true, terminou: true, palavra: "MAÇÃ" });
  });

  it("mostra a palavra só no fim, quando o boneco fica completo", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });

    const quase = await jogar(app, "ZXQWE");
    const fim = await chutar(app, quase.token, "R");

    expect(quase).toMatchObject({ erros: 5, palavra: null });
    expect(fim.body).toMatchObject({ erros: 6, acertou: false, terminou: true, palavra: "MAÇÃ", casas: CASAS_FECHADAS });
  });

  it("não deixa apagar um erro mexendo nas letras do token, nem usar um token assinado com outra chave", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });
    const comErros = await jogar(app, "ZXQWE");
    const deOutraChave = new TokenDoJogo("outro-segredo-com-mais-de-32-caracteres!!").assinar({ dia: "2026-11-03", letras: [] });

    const semOsErros = await chutar(app, comOutrasLetras(comErros.token, []), "R");
    const outraChave = await chutar(app, deOutraChave, "R");
    const inventado = await chutar(app, "nao-e-um-token", "R");

    for (const resposta of [semOsErros, outraChave, inventado]) {
      expect(resposta.status).toBe(400);
      expect(resposta.body.campos.token).toBe("Esta partida não é válida. Recarregue a página para começar de novo.");
    }
  });

  it("o token de login não serve como token do jogo, nem o do jogo como login", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });
    const { token: login } = await entrar(app, LARISSA);
    const { token: doJogo } = (await request(app).get("/palavra-do-dia")).body;

    expect((await chutar(app, login, "A")).status).toBe(400);
    expect((await request(app).get("/resultados").set(comLogin(doJogo))).status).toBe(401);
  });

  it("recusa a letra repetida, a inválida, a que vem sem token e a de depois do fim", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });
    const jogo = await jogar(app, "A");
    const fim = await jogar(app, "MAC");

    const repetida = await chutar(app, jogo.token, "a");
    const invalida = await chutar(app, jogo.token, "1");
    const semToken = await request(app).post("/palavra-do-dia/letras").send({ letra: "B" });
    const depoisDoFim = await chutar(app, fim.token, "B");

    expect(repetida.status).toBe(409);
    expect(repetida.body.mensagem).toBe("Você já chutou a letra A.");
    expect(invalida.status).toBe(400);
    expect(invalida.body.campos.letra).toBe("Envie uma letra de A a Z.");
    expect(semToken.status).toBe(400);
    expect(semToken.body.campos.token).toBeDefined();
    expect(depoisDoFim.status).toBe(409);
    expect(depoisDoFim.body.mensagem).toBe("Esta partida já terminou.");
  });

  it("deixa terminar a partida de ontem, perto da meia-noite, mas não a de antes de ontem", async () => {
    const instante = { atual: new Date("2026-11-03T23:59:00-03:00") };
    const { app } = criarAppTeste({ agora: () => instante.atual });
    const deOntem = await jogar(app, "MA");

    instante.atual = new Date("2026-11-04T00:01:00-03:00");
    const terminouOntem = await chutar(app, deOntem.token, "C");
    instante.atual = new Date("2026-11-05T00:01:00-03:00");
    const antesDeOntem = await chutar(app, deOntem.token, "C");

    expect(terminouOntem.body).toMatchObject({ dia: "2026-11-03", palavra: "MAÇÃ", acertou: true });
    expect(antesDeOntem.status).toBe(409);
    expect(antesDeOntem.body.mensagem).toBe("Esta partida é de outro dia. Recarregue a página para jogar a palavra de hoje.");
  });

  it("as letras de quem jogou sem conta vão para a conta quando a pessoa se cadastra", async () => {
    const { app } = criarAppTeste({ agora: () => new Date(DIA_3) });
    const doVisitante = await jogar(app, "ZMAC");

    const { token } = await entrar(app, LARISSA);
    const salvo = await request(app).post("/resultados").set(comLogin(token)).send({ dia: "2026-11-03", letras: doVisitante.letras });

    expect(salvo.status).toBe(201);
    expect(salvo.body).toMatchObject({ dia: "2026-11-03", palavra: "MAÇÃ", letras: ["Z", "M", "A", "C"], erros: 1, acertou: true });
  });
});
