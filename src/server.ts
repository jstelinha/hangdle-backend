import { criarApp } from "./app.js";
import { criarConexao } from "./banco/conexao.js";
import { lerAmbiente } from "./config/ambiente.js";
import { RepositorioListasMysql } from "./repositorios/RepositorioListasMysql.js";
import { RepositorioPalavrasDasListasMysql } from "./repositorios/RepositorioPalavrasDasListasMysql.js";
import { RepositorioPalavrasDoDiaMysql } from "./repositorios/RepositorioPalavrasDoDiaMysql.js";
import { RepositorioResultadosMysql } from "./repositorios/RepositorioResultadosMysql.js";
import { RepositorioUsuariosMysql } from "./repositorios/RepositorioUsuariosMysql.js";

const ambiente = lerAmbiente();
const banco = criarConexao(ambiente);

const app = criarApp({
  usuarios: new RepositorioUsuariosMysql(banco),
  palavrasDoDia: new RepositorioPalavrasDoDiaMysql(banco),
  resultados: new RepositorioResultadosMysql(banco),
  listas: new RepositorioListasMysql(banco),
  palavrasDasListas: new RepositorioPalavrasDasListasMysql(banco),
  agora: () => new Date(),
  verificarBanco: async () => {
    await banco.query("SELECT 1");
  },
  token: { segredo: ambiente.JWT_SEGREDO, expiracaoSegundos: ambiente.JWT_EXPIRACAO_SEGUNDOS },
  corsOrigens: ambiente.CORS_ORIGENS,
  tentativasPorJanela: ambiente.TENTATIVAS_POR_JANELA,
});

app.listen(ambiente.PORT, "0.0.0.0", () => {
  console.log(`API do Hangdle ouvindo na porta ${ambiente.PORT}`);
});
