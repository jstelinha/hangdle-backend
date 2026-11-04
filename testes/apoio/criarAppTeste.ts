import { criarApp } from "../../src/app.js";
import { RepositorioPalavrasDoDiaMemoria, type PalavraCadastrada } from "./RepositorioPalavrasDoDiaMemoria.js";
import { RepositorioResultadosMemoria } from "./RepositorioResultadosMemoria.js";
import { RepositorioUsuariosMemoria } from "./RepositorioUsuariosMemoria.js";

export const SEGREDO_TESTE = "segredo-so-para-teste-com-mais-de-32-caracteres";

export const LARISSA = {
  nome: "Larissa Souza",
  email: "larissa@exemplo.com",
  cpf: "529.982.247-25",
  senha: "Hangdle#2026",
};

export const BRUNA = {
  nome: "Bruna Lima",
  email: "bruna@exemplo.com",
  cpf: "111.444.777-35",
  senha: "Hangdle#2026",
};

export const PALAVRAS_TESTE: PalavraCadastrada[] = [
  { palavra: "MAÇÃ", categoria: "Comida" },
  { palavra: "ARARA", categoria: "Animais" },
];

type OpcoesAppTeste = {
  tentativasPorJanela?: number;
  agora?: () => Date;
  palavras?: PalavraCadastrada[];
};

export function criarAppTeste({
  tentativasPorJanela = 1000,
  agora = () => new Date("2026-11-03T12:00:00-03:00"),
  palavras = PALAVRAS_TESTE,
}: OpcoesAppTeste = {}) {
  const usuarios = new RepositorioUsuariosMemoria();
  const app = criarApp({
    usuarios,
    palavrasDoDia: new RepositorioPalavrasDoDiaMemoria(palavras),
    resultados: new RepositorioResultadosMemoria(),
    agora,
    verificarBanco: async () => {},
    token: { segredo: SEGREDO_TESTE, expiracaoSegundos: 3600 },
    corsOrigens: ["http://localhost"],
    tentativasPorJanela,
  });
  return { app, usuarios };
}
