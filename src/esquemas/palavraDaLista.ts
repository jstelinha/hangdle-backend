import { z } from "zod";
import { normalizarNome } from "../dominio/Nome.js";
import { identificador, texto } from "./comuns.js";

export const TAMANHO_MINIMO_PALAVRA = 3;
export const TAMANHO_MAXIMO_PALAVRA = 30;
export const TAMANHO_MINIMO_DICA = 2;
export const TAMANHO_MAXIMO_DICA = 80;

// A mesma regra do CHECK em mysql/06-listas.sql.
const FORMATO_DA_PALAVRA = /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+([ -][A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+)*$/;

function normalizarPalavra(palavra: string): string {
  return normalizarNome(palavra).normalize("NFC").toLocaleUpperCase("pt-BR");
}

function normalizarDica(dica: string | null | undefined): string | null {
  const limpa = normalizarNome(dica ?? "");
  return limpa === "" ? null : limpa;
}

export const esquemaPalavraDaLista = z.object({
  palavra: texto("Informe a palavra.")
    .transform(normalizarPalavra)
    .refine(
      (palavra) => palavra.length >= TAMANHO_MINIMO_PALAVRA && palavra.length <= TAMANHO_MAXIMO_PALAVRA,
      `A palavra precisa ter de ${TAMANHO_MINIMO_PALAVRA} a ${TAMANHO_MAXIMO_PALAVRA} letras.`,
    )
    .refine((palavra) => FORMATO_DA_PALAVRA.test(palavra), "Use só letras, com espaço ou hífen entre as partes."),
  dica: z
    .string({ error: "Envie a dica como texto." })
    .nullish()
    .transform(normalizarDica)
    .refine(
      (dica) => dica === null || (dica.length >= TAMANHO_MINIMO_DICA && dica.length <= TAMANHO_MAXIMO_DICA),
      `A dica precisa ter de ${TAMANHO_MINIMO_DICA} a ${TAMANHO_MAXIMO_DICA} caracteres.`,
    ),
});

export const esquemaListaDasPalavras = z.object({
  listaId: identificador("Lista inválida."),
});

export const esquemaIdPalavra = esquemaListaDasPalavras.extend({
  id: identificador("Palavra inválida."),
});

export type DadosPalavra = z.infer<typeof esquemaPalavraDaLista>;
