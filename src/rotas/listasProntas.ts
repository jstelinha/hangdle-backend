import { Router, type RequestHandler } from "express";
import { esquemaIdListaPronta } from "../esquemas/listaPronta.js";
import { usuarioLogado } from "../middlewares/exigirLogin.js";
import type { ServicoListasProntas } from "../servicos/ServicoListasProntas.js";

// As listas prontas são as mesmas para todo mundo e só para ler. Quem quer usar uma copia para as próprias listas.
export function rotasListasProntas(prontas: ServicoListasProntas, exigirLogin: RequestHandler): Router {
  const rotas = Router();

  rotas.get("/listas-prontas", exigirLogin, async (_requisicao, resposta) => {
    resposta.json({ listas: await prontas.listar() });
  });

  rotas.post("/listas-prontas/:id/copias", exigirLogin, async (requisicao, resposta) => {
    const { id } = esquemaIdListaPronta.parse(requisicao.params);
    resposta.status(201).json(await prontas.copiar(usuarioLogado(resposta), id));
  });

  return rotas;
}
