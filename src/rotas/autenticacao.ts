import { Router, type RequestHandler } from "express";
import { esquemaLogin } from "../esquemas/usuario.js";
import type { ServicoAutenticacao } from "../servicos/ServicoAutenticacao.js";

export function rotasAutenticacao(autenticacao: ServicoAutenticacao, limite: RequestHandler): Router {
  const rotas = Router();

  rotas.post("/login", limite, async (requisicao, resposta) => {
    const dados = esquemaLogin.parse(requisicao.body);
    const sessao = await autenticacao.entrar(dados);
    resposta.status(200).json(sessao);
  });

  return rotas;
}
