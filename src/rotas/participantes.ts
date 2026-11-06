import { Router, type RequestHandler } from "express";
import { esquemaPaginacao } from "../esquemas/paginacao.js";
import {
  esquemaEdicaoParticipante,
  esquemaEntrada,
  esquemaIdParticipante,
  esquemaSalaDosParticipantes,
} from "../esquemas/participante.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoParticipantes } from "../servicos/ServicoParticipantes.js";

// Rubrica de Back-end - Cruds Completos - 4 CRUDS com todas as rotas autenticadas
export function rotasParticipantes(
  participantes: ServicoParticipantes,
  exigirLogin: RequestHandler,
  limiteEntrada: RequestHandler,
): Router {
  const rotas = Router();

  rotas.get("/salas/:salaId/participantes", exigirLogin, async (requisicao, resposta) => {
    const { salaId } = esquemaSalaDosParticipantes.parse(requisicao.params);
    const pedido = esquemaPaginacao.parse(requisicao.query);
    resposta.json(await participantes.listar(usuarioLogado(resposta), salaId, pedido));
  });

  rotas.get("/salas/:salaId/participantes/:id", exigirLogin, async (requisicao, resposta) => {
    const { salaId, id } = esquemaIdParticipante.parse(requisicao.params);
    resposta.json(await participantes.buscar(usuarioLogado(resposta), salaId, id));
  });

  // Errar a senha da sala conta como as tentativas de login, para ninguém adivinhar a senha.
  rotas.post("/salas/:salaId/participantes", exigirLogin, limiteEntrada, async (requisicao, resposta) => {
    const { salaId } = esquemaSalaDosParticipantes.parse(requisicao.params);
    const dados = esquemaEntrada.parse(requisicao.body);
    resposta.status(201).json(await participantes.entrar(usuarioLogado(resposta), salaId, dados));
  });

  rotas.put("/salas/:salaId/participantes/:id", exigirLogin, async (requisicao, resposta) => {
    const { salaId, id } = esquemaIdParticipante.parse(requisicao.params);
    const dados = esquemaEdicaoParticipante.parse(requisicao.body);
    resposta.json(await participantes.editar(usuarioLogado(resposta), salaId, id, dados));
  });

  rotas.delete("/salas/:salaId/participantes/:id", exigirLogin, async (requisicao, resposta) => {
    const { salaId, id } = esquemaIdParticipante.parse(requisicao.params);
    await participantes.sair(usuarioLogado(resposta), salaId, id);
    resposta.status(204).end();
  });

  return rotas;
}
