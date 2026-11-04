import { Router } from "express";
import type { ServicoPalavraDoDia } from "../servicos/ServicoPalavraDoDia.js";

export function rotasPalavraDoDia(palavraDoDia: ServicoPalavraDoDia): Router {
  const rotas = Router();

  rotas.get("/palavra-do-dia", async (_requisicao, resposta) => {
    resposta.json(await palavraDoDia.deHoje());
  });

  return rotas;
}
