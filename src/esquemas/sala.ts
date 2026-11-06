import { z } from "zod";
import { normalizarNome } from "../dominio/Nome.js";
import { JOGADORES, RODADAS, SEGUNDOS_POR_RODADA } from "../dominio/Sala.js";
import { MENSAGEM_SENHA_DA_SALA, senhaDaSalaValida } from "../dominio/SenhaDaSala.js";
import { identificador, texto } from "./comuns.js";
import { esquemaPaginacao } from "./paginacao.js";

const TAMANHO_MINIMO_NOME = 2;
const TAMANHO_MAXIMO_NOME = 40;
const RODADAS_INVALIDAS = `Escolha de ${RODADAS.minimo} a ${RODADAS.maximo} rodadas.`;
const JOGADORES_INVALIDOS = `Escolha de ${JOGADORES.minimo} a ${JOGADORES.maximo} jogadores.`;

function inteiroEntre(minimo: number, maximo: number, mensagem: string) {
  return z.number({ error: mensagem }).int(mensagem).min(minimo, mensagem).max(maximo, mensagem);
}

const senhaComoTexto = z.string({ error: "Envie a senha como texto." });

const configuracao = {
  nome: texto("Informe o nome da sala.")
    .transform(normalizarNome)
    .refine(
      (nome) => nome.length >= TAMANHO_MINIMO_NOME && nome.length <= TAMANHO_MAXIMO_NOME,
      `O nome da sala precisa ter de ${TAMANHO_MINIMO_NOME} a ${TAMANHO_MAXIMO_NOME} caracteres.`,
    ),
  listaId: identificador("Lista inválida.")
    .nullish()
    .transform((id) => id ?? null),
  segundosPorRodada: z.literal(SEGUNDOS_POR_RODADA, { error: "Escolha 45, 90 ou 120 segundos por rodada." }),
  rodadas: inteiroEntre(RODADAS.minimo, RODADAS.maximo, RODADAS_INVALIDAS),
  maximoDeJogadores: inteiroEntre(JOGADORES.minimo, JOGADORES.maximo, JOGADORES_INVALIDOS),
};

// Ao criar, sem senha (ou com a senha vazia) a sala é pública.
export const esquemaNovaSala = z.object({
  ...configuracao,
  senha: senhaComoTexto
    .nullish()
    .transform((senha) => (senha ? senha : null))
    .refine((senha) => senha === null || senhaDaSalaValida(senha), MENSAGEM_SENHA_DA_SALA),
});

// Ao editar, a senha que não vem fica como está; null deixa a sala pública; um texto troca a senha.
export const esquemaEdicaoSala = z.object({
  ...configuracao,
  senha: senhaComoTexto
    .nullable()
    .optional()
    .transform((senha) => (senha === "" ? undefined : senha))
    .refine((senha) => typeof senha !== "string" || senhaDaSalaValida(senha), MENSAGEM_SENHA_DA_SALA),
});

export const esquemaIdSala = z.object({
  id: identificador("Sala inválida."),
});

export const esquemaFiltroSalas = esquemaPaginacao.extend({
  filtro: z.enum(["abertas", "minhas"], { error: "Use filtro=abertas ou filtro=minhas." }).default("abertas"),
});

export type DadosNovaSala = z.infer<typeof esquemaNovaSala>;
export type DadosEdicaoSala = z.infer<typeof esquemaEdicaoSala>;
export type FiltroSalas = z.infer<typeof esquemaFiltroSalas>;
