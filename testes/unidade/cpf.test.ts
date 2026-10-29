import { describe, expect, it } from "vitest";
import { Cpf, cpfValido } from "../../src/dominio/Cpf.js";
import { ErroValidacao } from "../../src/erros/ErroAplicacao.js";

describe("validação de CPF", () => {
  it.each(["529.982.247-25", "52998224725", "111.444.777-35", " 111.444.777-35 "])("aceita %s", (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it.each([
    ["segundo dígito errado", "529.982.247-24"],
    ["primeiro dígito errado", "529.982.247-15"],
    ["todos os dígitos iguais", "111.111.111-11"],
    ["só zeros", "000.000.000-00"],
    ["10 dígitos", "5299822472"],
    ["12 dígitos", "529982247255"],
    ["letra no lugar do dígito", "529.982.247-2a"],
    ["letras depois dos números", "52998224725abc"],
    ["espaços no lugar dos pontos", "529 982 247 25"],
    ["vazio", ""],
  ])("recusa CPF com %s", (_motivo, cpf) => {
    expect(cpfValido(cpf)).toBe(false);
  });

  it("guarda só os 11 dígitos, sem pontuação", () => {
    expect(new Cpf("529.982.247-25").digitos).toBe("52998224725");
  });

  it("não deixa criar um Cpf inválido", () => {
    expect(() => new Cpf("529.982.247-24")).toThrow(ErroValidacao);
  });
});
