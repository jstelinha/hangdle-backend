import { z } from "zod";
import { cpfValido } from "../dominio/Cpf.js";
import { emailValido, normalizarEmail } from "../dominio/Email.js";
import { nomeValido, normalizarNome, TAMANHO_MAXIMO_NOME, TAMANHO_MINIMO_NOME } from "../dominio/Nome.js";
import { mensagemSenhaFraca, senhaForte } from "../dominio/Senha.js";

function texto(obrigatorio: string) {
  return z.string({
    error: (problema) => (problema.input === undefined || problema.input === null ? obrigatorio : "Envie este campo como texto."),
  });
}

// Rubrica de Exigência - zod
export const esquemaCadastro = z.object({
  nome: texto("Informe o nome.")
    .transform(normalizarNome)
    .refine(nomeValido, `O nome precisa ter de ${TAMANHO_MINIMO_NOME} a ${TAMANHO_MAXIMO_NOME} caracteres.`),
  email: texto("Informe o e-mail.")
    .transform(normalizarEmail)
    .refine(emailValido, "Digite um e-mail válido, como nome@exemplo.com."),
  cpf: texto("Informe o CPF.").trim().refine(cpfValido, "CPF inválido. Confira os 11 números."),
  senha: texto("Informe a senha.").superRefine((senha, contexto) => {
    if (!senhaForte(senha)) {
      contexto.addIssue({ code: "custom", message: mensagemSenhaFraca(senha) });
    }
  }),
});

export const esquemaLogin = z.object({
  email: texto("Informe o e-mail.")
    .transform(normalizarEmail)
    .refine(emailValido, "Digite um e-mail válido, como nome@exemplo.com."),
  senha: texto("Informe a senha.").min(1, "Informe a senha.").max(200, "E-mail ou senha incorretos."),
});

export type DadosCadastro = z.infer<typeof esquemaCadastro>;
export type DadosLogin = z.infer<typeof esquemaLogin>;
