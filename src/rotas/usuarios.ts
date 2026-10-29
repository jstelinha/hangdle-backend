import { Router, type RequestHandler } from "express";
import { esquemaCadastro } from "../esquemas/usuario.js";
import type { ServicoCadastro } from "../servicos/ServicoCadastro.js";

export function rotasUsuarios(cadastro: ServicoCadastro, limite: RequestHandler): Router {
  const rotas = Router();

  rotas.post("/usuarios", limite, async (requisicao, resposta) => {
    const dados = esquemaCadastro.parse(requisicao.body);
    const usuario = await cadastro.cadastrar(dados);
    resposta.status(201).json(usuario);
  });

  return rotas;
}
