import cors from "cors";
import express, { type Express } from "express";
import { limitarTentativas } from "./middlewares/limitarTentativas.js";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/tratarErros.js";
import type { RepositorioPalavrasDoDia } from "./repositorios/RepositorioPalavrasDoDia.js";
import type { RepositorioUsuarios } from "./repositorios/RepositorioUsuarios.js";
import { rotasAutenticacao } from "./rotas/autenticacao.js";
import { rotasPalavraDoDia } from "./rotas/palavraDoDia.js";
import { rotasSaude } from "./rotas/saude.js";
import { rotasUsuarios } from "./rotas/usuarios.js";
import { ServicoAutenticacao, type ConfiguracaoToken } from "./servicos/ServicoAutenticacao.js";
import { ServicoCadastro } from "./servicos/ServicoCadastro.js";
import { ServicoPalavraDoDia } from "./servicos/ServicoPalavraDoDia.js";

export type DependenciasApp = {
  usuarios: RepositorioUsuarios;
  palavrasDoDia: RepositorioPalavrasDoDia;
  agora: () => Date;
  verificarBanco: () => Promise<void>;
  token: ConfiguracaoToken;
  corsOrigens: string[];
  tentativasPorJanela: number;
};

export function criarApp(dependencias: DependenciasApp): Express {
  const app = express();
  const limiteCadastro = limitarTentativas(dependencias.tentativasPorJanela);
  const limiteLogin = limitarTentativas(dependencias.tentativasPorJanela, { contarSoFalhas: true });

  app.disable("x-powered-by");
  // O nginx é o único proxy na frente da API: o IP real é o último do X-Forwarded-For, que ele mesmo põe.
  app.set("trust proxy", 1);
  app.use(cors({ origin: dependencias.corsOrigens }));
  app.use(express.json({ limit: "10kb" }));

  app.use(rotasSaude(dependencias.verificarBanco));
  app.use(rotasUsuarios(new ServicoCadastro(dependencias.usuarios), limiteCadastro));
  app.use(rotasAutenticacao(new ServicoAutenticacao(dependencias.usuarios, dependencias.token), limiteLogin));
  app.use(rotasPalavraDoDia(new ServicoPalavraDoDia(dependencias.palavrasDoDia, dependencias.agora)));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
