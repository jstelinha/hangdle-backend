import { ChutesDaVez } from "../dominio/ChutesDaVez.js";
import type { EstadoDaPartida, Jogador, ResultadoDaVez, VezEmAndamento } from "../dominio/EstadoDaPartida.js";
import type { Participante } from "../dominio/Participante.js";
import { JOGADORES, type Sala } from "../dominio/Sala.js";
import {
  faseDaVez,
  prazoDaVez,
  proximaVez,
  segundosRestantes,
  type OpcaoDePalavra,
  type PalavraEscolhida,
  type RegistroVez,
} from "../dominio/Vez.js";
import { ErroConflito, ErroProibido, ErroValidacao } from "../erros/ErroAplicacao.js";
import type { DadosEscolha } from "../esquemas/partida.js";
import type { RepositorioParticipantes } from "../repositorios/RepositorioParticipantes.js";
import type { RepositorioVezes } from "../repositorios/RepositorioVezes.js";
import type { ServicoSalas } from "./ServicoSalas.js";

const OPCOES_POR_VEZ = 3;
// Cada passo muda uma coisa (cria, escolhe ou termina uma vez); uma partida inteira cabe com folga.
const PASSOS_POR_PERGUNTA = 200;
const ESCOLHA_DA_LISTA = "Escolha uma das palavras sorteadas da lista.";

type Andamento = { sala: Sala; jogadores: Participante[]; vez: RegistroVez | null };

function erroJaComecou(): ErroConflito {
  return new ErroConflito("A partida desta sala já começou.");
}

function adivinhadores(jogadores: readonly Participante[], vez: RegistroVez): number[] {
  return jogadores.filter((jogador) => jogador.id !== vez.escolhedorId).map((jogador) => jogador.id);
}

// A partida não tem relógio no servidor: cada pergunta à sala faz a partida andar até o momento atual.
export class ServicoPartidaNaSala {
  readonly #salas: ServicoSalas;
  readonly #participantes: RepositorioParticipantes;
  readonly #vezes: RepositorioVezes;
  readonly #agora: () => Date;

  constructor(salas: ServicoSalas, participantes: RepositorioParticipantes, vezes: RepositorioVezes, agora: () => Date) {
    this.#salas = salas;
    this.#participantes = participantes;
    this.#vezes = vezes;
    this.#agora = agora;
  }

  async comecar(usuarioId: number, salaId: number): Promise<EstadoDaPartida> {
    const sala = await this.#salas.buscar(salaId);
    if (sala.donoId !== usuarioId) {
      throw new ErroProibido("Só quem criou a sala pode começar a partida.");
    }
    if (sala.situacao !== "esperando") {
      throw erroJaComecou();
    }
    const jogadores = await this.#jogadores(salaId);
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
    const eu = await this.#euNaSala(usuarioId, salaId);
    await this.#avancar(salaId);
    return this.#montarEstado(eu, salaId);
  }

  async escolher(usuarioId: number, salaId: number, escolha: DadosEscolha): Promise<EstadoDaPartida> {
    const eu = await this.#euNaSala(usuarioId, salaId);
    const { sala, vez } = await this.#avancar(salaId);
    const agora = this.#agora();
    if (sala.situacao !== "jogando" || !vez || faseDaVez(vez, agora) !== "escolhendo") {
      throw new ErroConflito("Agora não é hora de escolher a palavra.");
    }
    if (vez.escolhedorId !== eu.id) {
      throw new ErroProibido("Não é a sua vez de escolher a palavra.");
    }
    const palavra = this.#palavraDaEscolha(await this.#opcoes(sala, vez), escolha);
    if (!(await this.#vezes.escolherPalavra(vez.id, palavra, agora))) {
      throw new ErroConflito("A palavra desta vez já foi escolhida.");
    }
    return this.#montarEstado(eu, salaId);
  }

  async chutar(usuarioId: number, salaId: number, letra: string): Promise<EstadoDaPartida> {
    const eu = await this.#euNaSala(usuarioId, salaId);
    const { sala, jogadores, vez } = await this.#avancar(salaId);
    if (sala.situacao !== "jogando" || !vez?.palavra || faseDaVez(vez, this.#agora()) !== "adivinhando") {
      throw new ErroConflito("Agora não é hora de chutar.");
    }
    if (vez.escolhedorId === eu.id) {
      throw new ErroProibido("Quem escolheu a palavra não chuta.");
    }
    const chutes = new ChutesDaVez(vez.palavra, adivinhadores(jogadores, vez), await this.#vezes.letras(vez.id));
    chutes.chutar(eu.id, letra);
    await this.#vezes.guardarLetra(vez.id, { participanteId: eu.id, letra });
    await this.#avancar(salaId);
    return this.#montarEstado(eu, salaId);
  }

  async #euNaSala(usuarioId: number, salaId: number): Promise<Participante> {
    await this.#salas.buscar(salaId);
    const eu = await this.#participantes.buscarNaSala(salaId, usuarioId);
    if (!eu) {
      throw new ErroProibido("Entre na sala para jogar.");
    }
    return eu;
  }

  async #jogadores(salaId: number): Promise<Participante[]> {
    const pagina = await this.#participantes.listar(salaId, { pagina: 1, porPagina: JOGADORES.maximo });
    return pagina.itens;
  }

  async #avancar(salaId: number): Promise<Andamento> {
    for (let passo = 0; passo < PASSOS_POR_PERGUNTA; passo++) {
      const sala = await this.#salas.buscar(salaId);
      const jogadores = await this.#jogadores(salaId);
      const [vez = null] = await this.#vezes.ultimas(salaId, 1);
      if (sala.situacao !== "jogando" || !(await this.#darUmPasso(sala, jogadores, vez))) {
        return { sala, jogadores, vez };
      }
    }
    throw new Error("A partida não parou de avançar.");
  }

  // Devolve se mudou alguma coisa. Quem perguntar ao mesmo tempo tenta a mesma mudança, e o banco aceita só uma.
  async #darUmPasso(sala: Sala, jogadores: Participante[], vez: RegistroVez | null): Promise<boolean> {
    const agora = this.#agora();
    if (jogadores.length < JOGADORES.minimo) {
      await this.#vezes.encerrarPartida(sala.id);
      return true;
    }
    if (!vez || vez.terminouEm) {
      const seguinte = proximaVez(vez, jogadores.map((jogador) => jogador.id), sala.rodadas, agora);
      await (seguinte ? this.#vezes.criar(sala.id, seguinte) : this.#vezes.encerrarPartida(sala.id));
      return true;
    }
    const prazo = prazoDaVez(vez, sala.segundosPorRodada, agora);
    const acabouOTempo = prazo !== null && agora >= prazo;
    switch (faseDaVez(vez, agora)) {
      case "escolhendo":
        if (acabouOTempo) {
          await this.#vezes.escolherPalavra(vez.id, await this.#sortear(sala, vez), agora);
        }
        return acabouOTempo;
      case "adivinhando": {
        const chutes = new ChutesDaVez(vez.palavra ?? "", adivinhadores(jogadores, vez), await this.#vezes.letras(vez.id));
        if (!acabouOTempo && !chutes.todosTerminaram) {
          return false;
        }
        await this.#vezes.terminar(vez.id, acabouOTempo && prazo ? prazo : agora, chutes.pontos(vez.escolhedorId));
        return true;
      }
      default:
        return false;
    }
  }

  #opcoes(sala: Sala, vez: RegistroVez): Promise<OpcaoDePalavra[]> {
    return sala.listaId === null ? Promise.resolve([]) : this.#vezes.opcoesDaLista(sala.id, sala.listaId, vez.id, OPCOES_POR_VEZ);
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

  // Quem estava na vez não escolheu a tempo: sai a primeira opção da lista ou uma palavra oficial.
  async #sortear(sala: Sala, vez: RegistroVez): Promise<PalavraEscolhida> {
    const [opcao] = await this.#opcoes(sala, vez);
    const sorteada = opcao ? { palavra: opcao.palavra, dica: opcao.dica } : await this.#vezes.sortearPalavraOficial(sala.id);
    if (!sorteada) {
      throw new Error("Não há palavras oficiais para sortear.");
    }
    return sorteada;
  }

  async #montarEstado(eu: Participante, salaId: number): Promise<EstadoDaPartida> {
    const sala = await this.#salas.buscar(salaId);
    const jogadores = await this.#jogadores(salaId);
    const [ultima = null, penultima = null] = await this.#vezes.ultimas(salaId, 2);
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
      return { ...base, fase: "escolhendo", opcoes: souQuemEscolhe ? await this.#opcoes(sala, vez) : null };
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
