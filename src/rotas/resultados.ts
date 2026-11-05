import { Router, type RequestHandler } from "express";
import { esquemaFiltroResultados, esquemaResultado } from "../esquemas/resultado.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoResultados } from "../servicos/ServicoResultados.js";

export function rotasResultados(resultados: ServicoResultados, exigirLogin: RequestHandler): Router {
  const rotas = Router();

  rotas.post("/resultados", exigirLogin, async (requisicao, resposta) => {
    const dados = esquemaResultado.parse(requisicao.body);
    resposta.status(201).json(await resultados.registrar(usuarioLogado(resposta), dados));
  });

  rotas.get("/resultados", exigirLogin, async (requisicao, resposta) => {
    const { dia } = esquemaFiltroResultados.parse(requisicao.query);
    resposta.json({ resultados: await resultados.historico(usuarioLogado(resposta), dia) });
  });

  return rotas;
}
