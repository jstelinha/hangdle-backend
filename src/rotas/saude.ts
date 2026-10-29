import { Router } from "express";

export function rotasSaude(verificarBanco: () => Promise<void>): Router {
  const rotas = Router();

  rotas.get("/saude", async (_requisicao, resposta) => {
    try {
      await verificarBanco();
      resposta.json({ api: "ok", banco: "ok" });
    } catch (erro) {
      console.error(erro);
      resposta.status(503).json({ api: "ok", banco: "fora do ar" });
    }
  });

  return rotas;
}
