import { Router } from "express";
import { esquemaFiltroDia } from "../esquemas/resultado.js";
import type { ServicoResultados } from "../servicos/ServicoResultados.js";

export function rotasEstatisticas(resultados: ServicoResultados): Router {
  const rotas = Router();

  rotas.get("/palavra-do-dia/estatisticas", async (requisicao, resposta) => {
    const { dia } = esquemaFiltroDia.parse(requisicao.query);
    resposta.json(await resultados.estatisticasDoDia(dia));
  });

  return rotas;
}
