import { rateLimit } from "express-rate-limit";

const QUINZE_MINUTOS = 15 * 60 * 1000;

type OpcoesLimite = {
  contarSoFalhas?: boolean;
};

export function limitarTentativas(limite: number, { contarSoFalhas = false }: OpcoesLimite = {}) {
  return rateLimit({
    windowMs: QUINZE_MINUTOS,
    limit: limite,
    skipSuccessfulRequests: contarSoFalhas,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { mensagem: "Muitas tentativas seguidas. Espere 15 minutos e tente de novo." },
  });
}
