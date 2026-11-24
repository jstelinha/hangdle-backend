import type { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { ErroCredenciais } from "../erros/ErroAplicacao.js";

declare global {
  namespace Express {
    interface Locals {
      usuarioId?: number;
    }
  }
}

const SEM_LOGIN = "Entre na sua conta para continuar.";
const SESSAO_VENCIDA = "Sua sessão expirou. Entre de novo.";

function tokenDoCabecalho(cabecalho: string | undefined): string | null {
  const [tipo, token] = cabecalho?.split(" ") ?? [];
  return tipo === "Bearer" && token ? token : null;
}

function idDoUsuario(token: string, segredo: string): number {
  const conteudo = jwt.verify(token, segredo, { algorithms: ["HS256"] });
  const id = typeof conteudo === "object" ? Number(conteudo.sub) : Number.NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErroCredenciais(SEM_LOGIN);
  }
  return id;
}

export function exigirLogin(segredo: string): RequestHandler {
  return (requisicao, resposta, seguir) => {
    const token = tokenDoCabecalho(requisicao.headers.authorization);
    if (!token) {
      throw new ErroCredenciais(SEM_LOGIN);
    }
    try {
      resposta.locals.usuarioId = idDoUsuario(token, segredo);
    } catch (erro) {
      throw new ErroCredenciais(erro instanceof jwt.TokenExpiredError ? SESSAO_VENCIDA : SEM_LOGIN);
    }
    seguir();
  };
}

export function usuarioLogado(resposta: Response): number {
  const id = resposta.locals.usuarioId;
  if (id === undefined) {
    throw new ErroCredenciais(SEM_LOGIN);
  }
  return id;
}
