import type { Express } from "express";
import request from "supertest";
import { LARISSA } from "./criarAppTeste.js";

export type Pessoa = typeof LARISSA;

export async function entrar(app: Express, pessoa: Pessoa = LARISSA): Promise<{ id: number; token: string }> {
  await request(app).post("/usuarios").send(pessoa);
  const login = await request(app).post("/login").send({ email: pessoa.email, senha: pessoa.senha });
  return { id: login.body.usuario.id, token: login.body.token };
}

export function comLogin(token: string) {
  return { Authorization: `Bearer ${token}` };
}
