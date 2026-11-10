import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ErroAplicacao, type ErrosPorCampo } from "../erros/ErroAplicacao.js";

type ErroDoCorpo = { type: string; status: number };

function errosPorCampo(erro: ZodError): ErrosPorCampo {
  const campos: ErrosPorCampo = {};
  for (const problema of erro.issues) {
    const campo = problema.path[0];
    if (typeof campo === "string" && !(campo in campos)) {
      campos[campo] = problema.message;
    }
  }
  return campos;
}

function ehErroDoCorpo(erro: unknown): erro is ErroDoCorpo {
  return typeof erro === "object" && erro !== null && "type" in erro && "status" in erro;
}

export const rotaNaoEncontrada: RequestHandler = (_requisicao, resposta) => {
  resposta.status(404).json({ mensagem: "Rota não encontrada." });
};

// Rubrica de Tech Forge - Tratamento de Exceções e Organização do Código - Um lugar só transforma cada erro na resposta certa, em português
export const tratarErros: ErrorRequestHandler = (erro: unknown, _requisicao, resposta, _seguir) => {
  if (erro instanceof ZodError) {
    const campos = errosPorCampo(erro);
    const mensagem = Object.keys(campos).length > 0 ? "Confira os campos destacados." : "Envie os dados do formulário em JSON.";
    resposta.status(400).json({ mensagem, campos });
    return;
  }

  if (erro instanceof ErroAplicacao) {
    resposta.status(erro.status).json({ mensagem: erro.message, campos: erro.campos });
    return;
  }

  if (ehErroDoCorpo(erro) && erro.type === "entity.parse.failed") {
    resposta.status(400).json({ mensagem: "Os dados enviados não estão em JSON válido." });
    return;
  }

  if (ehErroDoCorpo(erro) && erro.type === "entity.too.large") {
    resposta.status(413).json({ mensagem: "Os dados enviados são grandes demais." });
    return;
  }

  console.error(erro);
  resposta.status(500).json({ mensagem: "Erro interno. Tente de novo em instantes." });
};
