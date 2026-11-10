import { z } from "zod";
import { identificador } from "./comuns.js";
import { esquemaPalavraDaLista, type DadosPalavra } from "./palavraDaLista.js";

export const esquemaSalaDaPartida = z.object({
  salaId: identificador("Sala inválida."),
});

export const esquemaLetra = z.object({
  letra: z
    .string({ error: "Envie uma letra de A a Z." })
    .regex(/^[A-Za-z]$/, "Envie uma letra de A a Z.")
    .transform((letra) => letra.toUpperCase()),
});

const esquemaOpcaoEscolhida = z.object({
  palavraId: identificador("Escolha uma das palavras sorteadas da lista."),
});

// Rubrica de Tech Forge - Tipagem Avançada e Recursos do TypeScript - União de tipos: a palavra vem da lista (pelo id) ou é digitada
export type DadosEscolha = z.infer<typeof esquemaOpcaoEscolhida> | DadosPalavra;

// Quem manda o palavraId escolheu da lista; quem não manda digitou a palavra, com as mesmas regras das listas.
export function lerEscolha(corpo: unknown): DadosEscolha {
  const daLista = typeof corpo === "object" && corpo !== null && "palavraId" in corpo;
  return daLista ? esquemaOpcaoEscolhida.parse(corpo) : esquemaPalavraDaLista.parse(corpo);
}
