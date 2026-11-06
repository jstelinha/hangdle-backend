import { Router, type RequestHandler } from "express";
import { esquemaEdicaoSala, esquemaFiltroSalas, esquemaIdSala, esquemaNovaSala } from "../esquemas/sala.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoSalas } from "../servicos/ServicoSalas.js";

// Rubrica de Back-end - Cruds Completos - 4 CRUDS com todas as rotas autenticadas
export function rotasSalas(salas: ServicoSalas, exigirLogin: RequestHandler): Router {
  const rotas = Router();

  rotas.get("/salas", exigirLogin, async (requisicao, resposta) => {
    const filtro = esquemaFiltroSalas.parse(requisicao.query);
    resposta.json(await salas.listar(usuarioLogado(resposta), filtro));
  });

  rotas.get("/salas/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdSala.parse(requisicao.params);
    resposta.json(await salas.buscar(id));
  });

  rotas.post("/salas", exigirLogin, async (requisicao, resposta) => {
    const dados = esquemaNovaSala.parse(requisicao.body);
    resposta.status(201).json(await salas.criar(usuarioLogado(resposta), dados));
  });

  rotas.put("/salas/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdSala.parse(requisicao.params);
    const dados = esquemaEdicaoSala.parse(requisicao.body);
    resposta.json(await salas.editar(usuarioLogado(resposta), id, dados));
  });

  rotas.delete("/salas/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdSala.parse(requisicao.params);
    await salas.apagar(usuarioLogado(resposta), id);
    resposta.status(204).end();
  });

  return rotas;
}
