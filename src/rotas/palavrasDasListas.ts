import { Router, type RequestHandler } from "express";
import { esquemaPaginacao } from "../esquemas/paginacao.js";
import { esquemaIdPalavra, esquemaListaDasPalavras, esquemaPalavraDaLista } from "../esquemas/palavraDaLista.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoPalavrasDasListas } from "../servicos/ServicoPalavrasDasListas.js";

// Rubrica de Back-end - Cruds Completos - 4 CRUDS com todas as rotas autenticadas
export function rotasPalavrasDasListas(palavras: ServicoPalavrasDasListas, exigirLogin: RequestHandler): Router {
  const rotas = Router();

  rotas.get("/listas/:listaId/palavras", exigirLogin, async (requisicao, resposta) => {
    const { listaId } = esquemaListaDasPalavras.parse(requisicao.params);
    const pedido = esquemaPaginacao.parse(requisicao.query);
    resposta.json(await palavras.listar(usuarioLogado(resposta), listaId, pedido));
  });

  rotas.get("/listas/:listaId/palavras/:id", exigirLogin, async (requisicao, resposta) => {
    const { listaId, id } = esquemaIdPalavra.parse(requisicao.params);
    resposta.json(await palavras.buscar(usuarioLogado(resposta), listaId, id));
  });

  rotas.post("/listas/:listaId/palavras", exigirLogin, async (requisicao, resposta) => {
    const { listaId } = esquemaListaDasPalavras.parse(requisicao.params);
    const dados = esquemaPalavraDaLista.parse(requisicao.body);
    resposta.status(201).json(await palavras.criar(usuarioLogado(resposta), listaId, dados));
  });

  rotas.put("/listas/:listaId/palavras/:id", exigirLogin, async (requisicao, resposta) => {
    const { listaId, id } = esquemaIdPalavra.parse(requisicao.params);
    const dados = esquemaPalavraDaLista.parse(requisicao.body);
    resposta.json(await palavras.editar(usuarioLogado(resposta), listaId, id, dados));
  });

  rotas.delete("/listas/:listaId/palavras/:id", exigirLogin, async (requisicao, resposta) => {
    const { listaId, id } = esquemaIdPalavra.parse(requisicao.params);
    await palavras.apagar(usuarioLogado(resposta), listaId, id);
    resposta.status(204).end();
  });

  return rotas;
}
