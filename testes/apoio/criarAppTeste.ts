import { criarApp } from "../../src/app.js";
import { RepositorioUsuariosMemoria } from "./RepositorioUsuariosMemoria.js";

export const SEGREDO_TESTE = "segredo-so-para-teste-com-mais-de-32-caracteres";

export const LARISSA = {
  nome: "Larissa Souza",
  email: "larissa@exemplo.com",
  cpf: "529.982.247-25",
  senha: "Hangdle#2026",
};

export function criarAppTeste(tentativasPorJanela = 1000) {
  const usuarios = new RepositorioUsuariosMemoria();
  const app = criarApp({
    usuarios,
    verificarBanco: async () => {},
    token: { segredo: SEGREDO_TESTE, expiracaoSegundos: 3600 },
    corsOrigens: ["http://localhost"],
    tentativasPorJanela,
  });
  return { app, usuarios };
}
