import { describe, expect, it } from "vitest";
import { Email, emailValido } from "../../src/dominio/Email.js";

describe("validação de e-mail", () => {
  it.each(["ana@exemplo.com", "ana.silva+jogo@exemplo.com.br", "  ANA@EXEMPLO.COM  "])("aceita %s", (email) => {
    expect(emailValido(email)).toBe(true);
  });

  it.each([
    ["sem arroba", "ana"],
    ["sem domínio", "ana@"],
    ["sem nome", "@exemplo.com"],
    ["sem ponto no domínio", "ana@exemplo"],
    ["final com uma letra", "ana@exemplo.c"],
    ["espaço no nome", "ana silva@exemplo.com"],
    ["espaço no domínio", "ana@exem plo.com"],
    ["acento", "joão@exemplo.com"],
    ["mais de 254 caracteres", `${"a".repeat(250)}@x.com`],
  ])("recusa e-mail %s", (_motivo, email) => {
    expect(emailValido(email)).toBe(false);
  });

  it("guarda o e-mail em minúsculas e sem espaços nas pontas", () => {
    expect(new Email("  Ana.Silva@Exemplo.COM ").endereco).toBe("ana.silva@exemplo.com");
  });
});
