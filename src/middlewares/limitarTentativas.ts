import { rateLimit } from "express-rate-limit";

const QUINZE_MINUTOS = 15 * 60 * 1000;
export const UM_MINUTO = 60 * 1000;

type OpcoesLimite = {
  contarSoFalhas?: boolean;
  janelaMs?: number;
};

function tempoDeEspera(janelaMs: number): string {
  const minutos = Math.ceil(janelaMs / UM_MINUTO);
  return minutos === 1 ? "um minuto" : `${minutos} minutos`;
}

export function limitarTentativas(limite: number, { contarSoFalhas = false, janelaMs = QUINZE_MINUTOS }: OpcoesLimite = {}) {
  return rateLimit({
    windowMs: janelaMs,
    limit: limite,
    skipSuccessfulRequests: contarSoFalhas,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { mensagem: `Muitas tentativas seguidas. Espere ${tempoDeEspera(janelaMs)} e tente de novo.` },
  });
}
