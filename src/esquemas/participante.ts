import { z } from "zod";
import { normalizarNome } from "../dominio/Nome.js";
import { TAMANHO_MAXIMO_APELIDO, TAMANHO_MINIMO_APELIDO } from "../dominio/Participante.js";
import { identificador, texto } from "./comuns.js";

const apelido = texto("Escolha um apelido.")
  .transform(normalizarNome)
  .refine(
    (valor) => valor.length >= TAMANHO_MINIMO_APELIDO && valor.length <= TAMANHO_MAXIMO_APELIDO,
    `O apelido precisa ter de ${TAMANHO_MINIMO_APELIDO} a ${TAMANHO_MAXIMO_APELIDO} caracteres.`,
  );

export const esquemaEntrada = z.object({
  apelido,
  senha: z.string({ error: "Envie a senha como texto." }).max(200, "Senha da sala incorreta.").nullish(),
});

export const esquemaEdicaoParticipante = z.object({ apelido });

export const esquemaSalaDosParticipantes = z.object({
  salaId: identificador("Sala inválida."),
});

export const esquemaIdParticipante = esquemaSalaDosParticipantes.extend({
  id: identificador("Jogador inválido."),
});

export type DadosEntrada = z.infer<typeof esquemaEntrada>;
export type DadosEdicaoParticipante = z.infer<typeof esquemaEdicaoParticipante>;
