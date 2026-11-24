import { Router, type RequestHandler } from "express";
import { esquemaEdicao, esquemaIdUsuario } from "../esquemas/usuario.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoPerfil } from "../servicos/ServicoPerfil.js";

// Rubrica de Back-end - Edição de Usuário - Rota autenticada
export function rotasPerfil(perfil: ServicoPerfil, exigirLogin: RequestHandler): Router {
  const rotas = Router();

  rotas.get("/usuarios/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdUsuario.parse(requisicao.params);
    resposta.json(await perfil.buscar(usuarioLogado(resposta), id));
  });

  rotas.put("/usuarios/:id", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdUsuario.parse(requisicao.params);
    const dados = esquemaEdicao.parse(requisicao.body);
    resposta.json(await perfil.editar(usuarioLogado(resposta), id, dados));
  });

  return rotas;
}
