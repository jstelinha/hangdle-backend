import { z } from "zod";
import { normalizarNome } from "../dominio/Nome.js";
import { identificador, texto } from "./comuns.js";

export const TAMANHO_MINIMO_NOME_DA_LISTA = 2;
export const TAMANHO_MAXIMO_NOME_DA_LISTA = 40;

export const esquemaLista = z.object({
  nome: texto("Informe o nome da lista.")
    .transform(normalizarNome)
    .refine(
      (nome) => nome.length >= TAMANHO_MINIMO_NOME_DA_LISTA && nome.length <= TAMANHO_MAXIMO_NOME_DA_LISTA,
      `O nome da lista precisa ter de ${TAMANHO_MINIMO_NOME_DA_LISTA} a ${TAMANHO_MAXIMO_NOME_DA_LISTA} caracteres.`,
    ),
});

export const esquemaIdLista = z.object({
  id: identificador("Lista inválida."),
});

export type DadosLista = z.infer<typeof esquemaLista>;
