import { describe, expect, it } from "vitest";
import { avaliarSenha, mensagemSenhaFraca, Senha, senhaForte } from "../../src/dominio/Senha.js";
import { ErroValidacao } from "../../src/erros/ErroAplicacao.js";

function faltando(senha: string): string[] {
  return avaliarSenha(senha)
    .filter((requisito) => !requisito.atendido)
    .map((requisito) => requisito.codigo);
}

describe("nível de senha", () => {
  it("aceita senha com tamanho, maiúscula, minúscula, número e símbolo", () => {
    expect(senhaForte("Hangdle#2026")).toBe(true);
    expect(faltando("Hangdle#2026")).toEqual([]);
  });

  it.each([
    ["hangdle#2026", ["maiuscula"]],
    ["HANGDLE#2026", ["minuscula"]],
    ["Hangdle#abc", ["numero"]],
    ["Hangdle2026", ["simbolo"]],
    ["Senha com espaco 1", ["simbolo"]],
    ["Ha#1", ["tamanho"]],
    ["hangdle", ["tamanho", "maiuscula", "numero", "simbolo"]],
  ])("em %s falta %j", (senha, esperado) => {
    expect(faltando(senha)).toEqual(esperado);
    expect(senhaForte(senha)).toBe(false);
  });

  it("explica em português o que falta", () => {
    expect(mensagemSenhaFraca("hangdle")).toBe(
      "A senha precisa ter: pelo menos 8 caracteres, uma letra maiúscula, um número, um símbolo, como ! @ # $ %.",
    );
  });

  it("aceita 64 caracteres e recusa 65", () => {
    expect(senhaForte(`Aa1!${"a".repeat(60)}`)).toBe(true);
    expect(senhaForte(`Aa1!${"a".repeat(61)}`)).toBe(false);
    expect(mensagemSenhaFraca(`Aa1!${"a".repeat(61)}`)).toBe("A senha pode ter no máximo 64 caracteres.");
  });

  it("recusa senha curta em letras mas com mais de 72 bytes, que o bcrypt cortaria", () => {
    const senha = `Aa1!${"ç".repeat(40)}`;
    expect([...senha].length).toBe(44);
    expect(senhaForte(senha)).toBe(false);
  });

  it("guarda o hash bcrypt, nunca a senha", async () => {
    const senha = await Senha.criar("Hangdle#2026");
    expect(senha.hash).toMatch(/^\$2b\$12\$[./A-Za-z0-9]{53}$/);
    expect(senha.hash).not.toContain("Hangdle#2026");
    expect(await senha.confere("Hangdle#2026")).toBe(true);
    expect(await senha.confere("hangdle#2026")).toBe(false);
  });

  it("não deixa criar Senha fraca", async () => {
    await expect(Senha.criar("hangdle")).rejects.toThrow(ErroValidacao);
  });
});
