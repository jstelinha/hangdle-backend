import { Router } from "express";
import { esquemaJogadaDoDia } from "../esquemas/palavraDoDia.js";
import type { ServicoPalavraDoDia } from "../servicos/ServicoPalavraDoDia.js";

// Sem login: quem não tem conta também joga. A partida vai e volta no token, e a palavra só aparece no fim.
export function rotasPalavraDoDia(palavraDoDia: ServicoPalavraDoDia): Router {
  const rotas = Router();

  rotas.get("/palavra-do-dia", async (_requisicao, resposta) => {
    resposta.json(await palavraDoDia.comecar());
  });

  rotas.post("/palavra-do-dia/letras", async (requisicao, resposta) => {
    const dados = esquemaJogadaDoDia.parse(requisicao.body);
    resposta.json(await palavraDoDia.chutar(dados));
  });

  return rotas;
}
