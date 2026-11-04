import { describe, expect, it } from "vitest";
import { PartidaDiaria } from "../../src/dominio/PartidaDiaria.js";
import { ErroValidacao } from "../../src/erros/ErroAplicacao.js";

describe("partida diária", () => {
  it("acerta quando todas as letras da palavra foram chutadas, sem contar acentos", () => {
    const partida = new PartidaDiaria("MAÇÃ", ["Z", "M", "A", "C"]);

    expect(partida.acertou).toBe(true);
    expect(partida.erros).toBe(1);
    expect(partida.chutes).toBe(4);
  });

  it("espaços e hífens não precisam ser chutados", () => {
    expect(new PartidaDiaria("GUARDA-CHUVA", [..."GUARDCHV"]).acertou).toBe(true);
    expect(new PartidaDiaria("PÃO DE QUEIJO", [..."PAODEQUIJ"]).acertou).toBe(true);
  });

  it("perde no sexto erro", () => {
    const partida = new PartidaDiaria("MAÇÃ", [..."ZWYKLB"]);

    expect(partida.acertou).toBe(false);
    expect(partida.erros).toBe(6);
  });

  it.each([
    ["partida que ainda não acabou", ["M", "A"], "A partida ainda não terminou."],
    ["letra depois do acerto", ["M", "A", "C", "Z"], "Há letras depois do fim da partida."],
    ["letra depois do sexto erro", [..."ZWYKLBM"], "Há letras depois do fim da partida."],
    ["letra repetida", ["M", "M", "A", "C"], "A letra M foi enviada mais de uma vez."],
    ["algo que não é letra", ["M", "4"], "Envie só letras de A a Z."],
  ])("recusa %s", (_caso, letras, mensagem) => {
    expect(() => new PartidaDiaria("MAÇÃ", letras)).toThrow(ErroValidacao);
    expect(() => new PartidaDiaria("MAÇÃ", letras)).toThrow(mensagem);
  });
});
