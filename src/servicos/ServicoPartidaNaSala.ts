import { ChutesDaVez } from "../dominio/ChutesDaVez.js";
import type { EstadoDaPartida, Jogador, ResultadoDaVez, VezEmAndamento } from "../dominio/EstadoDaPartida.js";
import type { Participante } from "../dominio/Participante.js";
import { JOGADORES, SALA_NAO_ENCONTRADA, type Sala } from "../dominio/Sala.js";
import { faseDaVez, prazoDaVez, proximaVez, segundosRestantes, type OpcaoDePalavra, type PalavraEscolhida, type RegistroVez } from "../dominio/Vez.js";
import { ErroConflito, ErroNaoEncontrado, ErroProibido, ErroValidacao } from "../erros/ErroAplicacao.js";
import type { DadosEscolha } from "../esquemas/partida.js";
import type { RepositorioVezes } from "../repositorios/RepositorioVezes.js";
import { adivinhadores, type Andamento, type AndamentoDaPartida } from "./AndamentoDaPartida.js";

const ESCOLHA_DA_LISTA = "Escolha uma das palavras sorteadas da lista.";

function erroJaComecou(): ErroConflito {
  return new ErroConflito("A partida desta sala já começou.");
}

// Começar, escolher e chutar; cada pergunta faz antes a partida andar até agora (AndamentoDaPartida).
export class ServicoPartidaNaSala {
  readonly #andamento: AndamentoDaPartida;
  readonly #vezes: RepositorioVezes;
  readonly #agora: () => Date;

  constructor(andamento: AndamentoDaPartida, vezes: RepositorioVezes, agora: () => Date) {
    this.#andamento = andamento;
    this.#vezes = vezes;
    this.#agora = agora;
  }

  async comecar(usuarioId: number, salaId: number): Promise<EstadoDaPartida> {
    const { sala, jogadores } = await this.#avancar(salaId);
    if (sala.donoId !== usuarioId) {
      throw new ErroProibido("Só quem criou a sala pode começar a partida.");
    }
    if (sala.situacao !== "esperando") {
      throw erroJaComecou();
    }
    if (jogadores.length < JOGADORES.minimo) {
      throw new ErroConflito("A partida precisa de pelo menos 2 jogadores. Mande o convite para alguém.");
    }
    const primeira = proximaVez(null, jogadores.map((jogador) => jogador.id), sala.rodadas, this.#agora());
    if (!primeira || !(await this.#vezes.comecarPartida(salaId, primeira))) {
      throw erroJaComecou();
    }
    return this.estado(usuarioId, salaId);
  }

  async estado(usuarioId: number, salaId: number): Promise<EstadoDaPartida> {
    const { eu, ...andamento } = await this.#comigo(usuarioId, salaId);
    return this.#montarEstado(eu, andamento);
  }

  async escolher(usuarioId: number, salaId: number, escolha: DadosEscolha): Promise<EstadoDaPartida> {
    const { eu, sala, vez } = await this.#comigo(usuarioId, salaId);
    const agora = this.#agora();
    if (sala.situacao !== "jogando" || !vez || faseDaVez(vez, agora) !== "escolhendo") {
      throw new ErroConflito("Agora não é hora de escolher a palavra.");
    }
    if (vez.escolhedorId !== eu.id) {
      throw new ErroProibido("Não é a sua vez de escolher a palavra.");
    }
    const palavra = this.#palavraDaEscolha(await this.#andamento.opcoes(sala, vez), escolha);
    if (!(await this.#vezes.escolherPalavra(vez.id, palavra, agora))) {
      throw new ErroConflito("A palavra desta vez já foi escolhida.");
    }
    return this.#montarEstado(eu, await this.#avancar(salaId));
  }

  async chutar(usuarioId: number, salaId: number, letra: string): Promise<EstadoDaPartida> {
    const { eu, sala, jogadores, vez } = await this.#comigo(usuarioId, salaId);
    if (sala.situacao !== "jogando" || !vez?.palavra || faseDaVez(vez, this.#agora()) !== "adivinhando") {
      throw new ErroConflito("Agora não é hora de chutar.");
    }
    if (vez.escolhedorId === eu.id) {
      throw new ErroProibido("Quem escolheu a palavra não chuta.");
    }
    const chutes = new ChutesDaVez(vez.palavra, adivinhadores(jogadores, vez), await this.#vezes.letras(vez.id));
    chutes.chutar(eu.id, letra);
    await this.#vezes.guardarLetra(vez.id, { participanteId: eu.id, letra });
    return this.#montarEstado(eu, await this.#avancar(salaId));
  }

  async #avancar(salaId: number): Promise<Andamento> {
    const andamento = await this.#andamento.avancar(salaId);
    if (!andamento) {
      throw new ErroNaoEncontrado(SALA_NAO_ENCONTRADA);
    }
    return andamento;
  }

  // A partida anda e a pessoa é achada entre os jogadores que vieram junto.
  async #comigo(usuarioId: number, salaId: number): Promise<Andamento & { eu: Participante }> {
    const andamento = await this.#avancar(salaId);
    const eu = andamento.jogadores.find((jogador) => jogador.usuarioId === usuarioId);
    if (!eu) {
      throw new ErroProibido("Entre na sala para jogar.");
    }
    return { ...andamento, eu };
  }

  #palavraDaEscolha(opcoes: OpcaoDePalavra[], escolha: DadosEscolha): PalavraEscolhida {
    if (opcoes.length === 0) {
      if ("palavraId" in escolha) {
        throw new ErroValidacao("Digite a palavra.", { palavra: "A lista da sala acabou. Digite a palavra." });
      }
      return escolha;
    }
    const opcao = "palavraId" in escolha ? opcoes.find(({ id }) => id === escolha.palavraId) : undefined;
    if (!opcao) {
      throw new ErroValidacao(ESCOLHA_DA_LISTA, { palavraId: ESCOLHA_DA_LISTA });
    }
    return { palavra: opcao.palavra, dica: opcao.dica };
  }

  async #montarEstado(eu: Participante, { sala, jogadores }: Andamento): Promise<EstadoDaPartida> {
    const [ultima = null, penultima = null] = await this.#vezes.ultimas(sala.id, 2);
    const emAndamento = ultima && !ultima.terminouEm ? ultima : null;
    const anterior = emAndamento ? penultima : ultima;
    return {
      situacao: sala.situacao,
      rodadas: sala.rodadas,
      eu: eu.id,
      placar: jogadores
        .map(({ id, apelido, pontos }) => ({ participanteId: id, apelido, pontos }))
        .sort((a, b) => b.pontos - a.pontos || a.participanteId - b.participanteId),
      vez: sala.situacao === "jogando" && emAndamento ? await this.#vezEmAndamento(sala, emAndamento, eu, jogadores) : null,
      anterior: anterior?.palavra && anterior.terminouEm ? await this.#resultado(anterior, anterior.palavra, jogadores) : null,
    };
  }

  async #vezEmAndamento(sala: Sala, vez: RegistroVez, eu: Participante, jogadores: Participante[]): Promise<VezEmAndamento> {
    const agora = this.#agora();
    const fase = faseDaVez(vez, agora);
    const souQuemEscolhe = vez.escolhedorId === eu.id;
    const base = {
      numero: vez.numero,
      rodada: vez.rodada,
      segundosRestantes: segundosRestantes(prazoDaVez(vez, sala.segundosPorRodada, agora), agora),
      escolhedor: this.#jogador(jogadores, vez.escolhedorId),
      opcoes: null,
      palavra: null,
      dica: null,
      minhaForca: null,
      forcas: [],
    };
    if (fase === "intervalo" || fase === "terminada") {
      return { ...base, fase: "intervalo" };
    }
    if (fase === "escolhendo" || !vez.palavra) {
      return { ...base, fase: "escolhendo", opcoes: souQuemEscolhe ? await this.#andamento.opcoes(sala, vez) : null };
    }
    const chutes = new ChutesDaVez(vez.palavra, adivinhadores(jogadores, vez), await this.#vezes.letras(vez.id));
    const minha = chutes.partidaDe(eu.id);
    return {
      ...base,
      fase: "adivinhando",
      palavra: souQuemEscolhe ? vez.palavra : null,
      dica: vez.dica,
      minhaForca: minha && {
        casas: minha.casas,
        letras: minha.letras,
        erros: minha.erros,
        acertou: minha.acertou,
        terminou: minha.terminou,
      },
      forcas: adivinhadores(jogadores, vez).flatMap((id) => {
        const partida = chutes.partidaDe(id);
        return partida
          ? [
              {
                ...this.#jogador(jogadores, id),
                erros: partida.erros,
                casasAbertas: partida.casas.filter((casa) => casa !== null && /\p{L}/u.test(casa)).length,
                acertou: partida.acertou,
                terminou: partida.terminou,
              },
            ]
          : [];
      }),
    };
  }

  async #resultado(vez: RegistroVez, palavra: string, jogadores: Participante[]): Promise<ResultadoDaVez> {
    const chutes = new ChutesDaVez(palavra, adivinhadores(jogadores, vez), await this.#vezes.letras(vez.id));
    return {
      numero: vez.numero,
      rodada: vez.rodada,
      escolhedor: this.#jogador(jogadores, vez.escolhedorId),
      palavra,
      dica: vez.dica,
      pontosDeQuemEscolheu: chutes.pontosDeQuemEscolheu(),
      jogadores: adivinhadores(jogadores, vez).map((id) => ({
        ...this.#jogador(jogadores, id),
        acertou: chutes.partidaDe(id)?.acertou ?? false,
        erros: chutes.partidaDe(id)?.erros ?? 0,
        pontos: chutes.pontosDe(id),
      })),
    };
  }

  #jogador(jogadores: Participante[], participanteId: number): Jogador {
    const apelido = jogadores.find((jogador) => jogador.id === participanteId)?.apelido ?? "Quem saiu";
    return { participanteId, apelido };
  }
}
