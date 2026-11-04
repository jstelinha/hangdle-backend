import { diaAnterior, diaNoFuso } from "../dominio/dia.js";
import { PartidaDiaria } from "../dominio/PartidaDiaria.js";
import type { ResultadoDiario } from "../dominio/ResultadoDiario.js";
import { ErroValidacao } from "../erros/ErroAplicacao.js";
import type { DadosResultado } from "../esquemas/resultado.js";
import type { RepositorioPalavrasDoDia } from "../repositorios/RepositorioPalavrasDoDia.js";
import type { RepositorioResultados } from "../repositorios/RepositorioResultados.js";

const SO_HOJE_OU_ONTEM = "Só dá para salvar o resultado de hoje ou de ontem.";
const SEM_PALAVRA = "Não houve palavra do dia nessa data.";

export class ServicoResultados {
  readonly #resultados: RepositorioResultados;
  readonly #palavrasDoDia: RepositorioPalavrasDoDia;
  readonly #agora: () => Date;

  constructor(resultados: RepositorioResultados, palavrasDoDia: RepositorioPalavrasDoDia, agora: () => Date) {
    this.#resultados = resultados;
    this.#palavrasDoDia = palavrasDoDia;
    this.#agora = agora;
  }

  async registrar(usuarioId: number, { dia, letras }: DadosResultado): Promise<ResultadoDiario> {
    const hoje = diaNoFuso(this.#agora());
    if (dia !== hoje && dia !== diaAnterior(hoje)) {
      throw new ErroValidacao(SO_HOJE_OU_ONTEM, { dia: SO_HOJE_OU_ONTEM });
    }

    const palavraDoDia = await this.#palavrasDoDia.buscar(dia);
    if (!palavraDoDia) {
      throw new ErroValidacao(SEM_PALAVRA, { dia: SEM_PALAVRA });
    }

    const partida = new PartidaDiaria(palavraDoDia.palavra, letras);
    const resultado: ResultadoDiario = {
      ...palavraDoDia,
      letras: partida.letras,
      chutes: partida.chutes,
      erros: partida.erros,
      acertou: partida.acertou,
    };
    await this.#resultados.salvar(usuarioId, resultado);
    return resultado;
  }

  historico(usuarioId: number, dia?: string): Promise<ResultadoDiario[]> {
    return this.#resultados.listar(usuarioId, dia);
  }
}
