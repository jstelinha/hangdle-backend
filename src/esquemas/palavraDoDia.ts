import { z } from "zod";
import { esquemaLetra } from "./partida.js";

const TOKEN = "Envie o token da partida, que veio na última resposta.";

// A letra chutada e o token com as letras de antes, como a API devolveu na última resposta.
export const esquemaJogadaDoDia = esquemaLetra.extend({
  token: z.string({ error: TOKEN }).min(1, TOKEN).max(1000, TOKEN),
});

// O que vai dentro do token, conferido de novo ao ler: a assinatura garante quem fez, e o esquema, o formato.
export const esquemaJogadasDoToken = z.object({
  dia: z.iso.date(),
  letras: z.array(z.string().regex(/^[A-Z]$/)).max(26),
});

export type DadosJogadaDoDia = z.infer<typeof esquemaJogadaDoDia>;
export type JogadasDoDia = z.infer<typeof esquemaJogadasDoToken>;
