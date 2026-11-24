import { Router, type RequestHandler } from "express";
import { esquemaIdLista, esquemaLista } from "../esquemas/lista.js";
import { esquemaPaginacao } from "../esquemas/paginacao.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoListas } from "../servicos/ServicoListas.js";

// Rubrica de Back-end - Cruds Completos - 4 CRUDS com todas as rotas autenticadas
export function rotasListas(listas: ServicoListas, exigirLogin: RequestHandler): Router {
  const rotas = Router();

  rotas.get("/listas", exigirLogin, async (requisicao, resposta) => {
    const pedido = esquemaPaginacao.parse(requisicao.query);
    resposta.json(await listas.listar(usuarioLogado(resposta), pedido));
  });

  rotas.get("/listas/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdLista.parse(requisicao.params);
    resposta.json(await listas.buscar(usuarioLogado(resposta), id));
  });

  rotas.post("/listas", exigirLogin, async (requisicao, resposta) => {
    const dados = esquemaLista.parse(requisicao.body);
    resposta.status(201).json(await listas.criar(usuarioLogado(resposta), dados));
  });

  rotas.put("/listas/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdLista.parse(requisicao.params);
    const dados = esquemaLista.parse(requisicao.body);
    resposta.json(await listas.editar(usuarioLogado(resposta), id, dados));
  });

  rotas.delete("/listas/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdLista.parse(requisicao.params);
    await listas.apagar(usuarioLogado(resposta), id);
    resposta.status(204).end();
  });

  return rotas;
}
