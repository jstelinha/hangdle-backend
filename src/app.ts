import cors from "cors";
import express, { type Express } from "express";
import { exigirLogin } from "./middlewares/exigirLogin.js";
import { limitarTentativas } from "./middlewares/limitarTentativas.js";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/tratarErros.js";
import type { RepositorioListas } from "./repositorios/RepositorioListas.js";
import type { RepositorioPalavrasDasListas } from "./repositorios/RepositorioPalavrasDasListas.js";
import type { RepositorioPalavrasDoDia } from "./repositorios/RepositorioPalavrasDoDia.js";
import type { RepositorioResultados } from "./repositorios/RepositorioResultados.js";
import type { RepositorioUsuarios } from "./repositorios/RepositorioUsuarios.js";
import { rotasAutenticacao } from "./rotas/autenticacao.js";
import { rotasEstatisticas } from "./rotas/estatisticas.js";
import { rotasListas } from "./rotas/listas.js";
import { rotasPalavrasDasListas } from "./rotas/palavrasDasListas.js";
import { rotasPalavraDoDia } from "./rotas/palavraDoDia.js";
import { rotasPerfil } from "./rotas/perfil.js";
import { rotasResultados } from "./rotas/resultados.js";
import { rotasSaude } from "./rotas/saude.js";
import { rotasUsuarios } from "./rotas/usuarios.js";
import { ServicoAutenticacao, type ConfiguracaoToken } from "./servicos/ServicoAutenticacao.js";
import { ServicoCadastro } from "./servicos/ServicoCadastro.js";
import { ServicoListas } from "./servicos/ServicoListas.js";
import { ServicoPalavrasDasListas } from "./servicos/ServicoPalavrasDasListas.js";
import { ServicoPalavraDoDia } from "./servicos/ServicoPalavraDoDia.js";
import { ServicoPerfil } from "./servicos/ServicoPerfil.js";
import { ServicoResultados } from "./servicos/ServicoResultados.js";

export type DependenciasApp = {
  usuarios: RepositorioUsuarios;
  palavrasDoDia: RepositorioPalavrasDoDia;
  resultados: RepositorioResultados;
  listas: RepositorioListas;
  palavrasDasListas: RepositorioPalavrasDasListas;
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
  const login = exigirLogin(dependencias.token.segredo);
  const { usuarios, palavrasDoDia, resultados, listas, palavrasDasListas, agora } = dependencias;
  const servicoResultados = new ServicoResultados(resultados, palavrasDoDia, agora);
  const servicoListas = new ServicoListas(listas);

  app.disable("x-powered-by");
  // O nginx é o único proxy na frente da API: o IP real é o último do X-Forwarded-For, que ele mesmo põe.
  app.set("trust proxy", 1);
  app.use(cors({ origin: dependencias.corsOrigens }));
  app.use(express.json({ limit: "10kb" }));

  app.use(rotasSaude(dependencias.verificarBanco));
  app.use(rotasUsuarios(new ServicoCadastro(usuarios), limiteCadastro));
  app.use(rotasPerfil(new ServicoPerfil(usuarios), login));
  app.use(rotasAutenticacao(new ServicoAutenticacao(usuarios, dependencias.token), limiteLogin));
  app.use(rotasEstatisticas(servicoResultados));
  app.use(rotasPalavraDoDia(new ServicoPalavraDoDia(palavrasDoDia, agora)));
  app.use(rotasResultados(servicoResultados, login));
  app.use(rotasListas(servicoListas, login));
  app.use(rotasPalavrasDasListas(new ServicoPalavrasDasListas(palavrasDasListas, servicoListas), login));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
