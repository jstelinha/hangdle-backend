import { Router, type RequestHandler } from "express";
import { esquemaLetra, esquemaSalaDaPartida, lerEscolha } from "../esquemas/partida.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoPartidaNaSala } from "../servicos/ServicoPartidaNaSala.js";

// Quem está na sala pergunta pela partida a cada segundo; a palavra só sai daqui para quem a escolheu.
export function rotasPartidaNaSala(partida: ServicoPartidaNaSala, exigirLogin: RequestHandler): Router {
  const rotas = Router();

  rotas.get("/salas/:salaId/partida", exigirLogin, async (requisicao, resposta) => {
    const { salaId } = esquemaSalaDaPartida.parse(requisicao.params);
    resposta.json(await partida.estado(usuarioLogado(resposta), salaId));
  });

  rotas.post("/salas/:salaId/partida", exigirLogin, async (requisicao, resposta) => {
    const { salaId } = esquemaSalaDaPartida.parse(requisicao.params);
    resposta.status(201).json(await partida.comecar(usuarioLogado(resposta), salaId));
  });

  rotas.post("/salas/:salaId/partida/palavra", exigirLogin, async (requisicao, resposta) => {
    const { salaId } = esquemaSalaDaPartida.parse(requisicao.params);
    const escolha = lerEscolha(requisicao.body);
    resposta.json(await partida.escolher(usuarioLogado(resposta), salaId, escolha));
  });

  rotas.post("/salas/:salaId/partida/letras", exigirLogin, async (requisicao, resposta) => {
    const { salaId } = esquemaSalaDaPartida.parse(requisicao.params);
    const { letra } = esquemaLetra.parse(requisicao.body);
    resposta.json(await partida.chutar(usuarioLogado(resposta), salaId, letra));
  });

  return rotas;
}
