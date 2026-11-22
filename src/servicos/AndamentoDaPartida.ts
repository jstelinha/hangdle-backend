import { ChutesDaVez } from "../dominio/ChutesDaVez.js";
import type { Participante } from "../dominio/Participante.js";
import { JOGADORES, type Sala } from "../dominio/Sala.js";
import { faseDaVez, prazoDaVez, proximaVez, type OpcaoDePalavra, type PalavraEscolhida, type RegistroVez } from "../dominio/Vez.js";
import type { RepositorioParticipantes } from "../repositorios/RepositorioParticipantes.js";
import type { RepositorioSalas } from "../repositorios/RepositorioSalas.js";
import type { RepositorioVezes } from "../repositorios/RepositorioVezes.js";

const OPCOES_POR_VEZ = 3;
// Cada passo muda uma coisa (sorteia a palavra, termina a vez e marca a seguinte); uma partida inteira cabe com folga.
const PASSOS_POR_PERGUNTA = 200;

export type Andamento = { sala: Sala; jogadores: Participante[]; vez: RegistroVez | null };

export function adivinhadores(jogadores: readonly Participante[], vez: RegistroVez): number[] {
  return jogadores.filter((jogador) => jogador.id !== vez.escolhedorId).map((jogador) => jogador.id);
}

// A partida não tem relógio no servidor: quem pergunta pela sala (ao jogar, abrir, listar ou sair) faz a partida andar até agora.
// Fala só com os repositórios, e não com os serviços: assim as salas, os participantes e a partida usam esta classe
// sem que um serviço precise do outro.
export class AndamentoDaPartida {
  readonly #salas: RepositorioSalas;
  readonly #participantes: RepositorioParticipantes;
  readonly #vezes: RepositorioVezes;
  readonly #agora: () => Date;

  constructor(salas: RepositorioSalas, participantes: RepositorioParticipantes, vezes: RepositorioVezes, agora: () => Date) {
    this.#salas = salas;
    this.#participantes = participantes;
    this.#vezes = vezes;
    this.#agora = agora;
  }

  // Devolve null se a sala não existe.
  async avancar(salaId: number): Promise<Andamento | null> {
    for (let passo = 0; passo < PASSOS_POR_PERGUNTA; passo++) {
      const sala = await this.#salas.buscar(salaId);
      if (!sala) {
        return null;
      }
      const jogadores = await this.#jogadores(salaId);
      const [vez = null] = await this.#vezes.ultimas(salaId, 1);
      if (sala.situacao !== "jogando" || !(await this.#darUmPasso(sala, jogadores, vez))) {
        return { sala, jogadores, vez };
      }
    }
    throw new Error("A partida não parou de avançar.");
  }

  opcoes(sala: Sala, vez: RegistroVez): Promise<OpcaoDePalavra[]> {
    return sala.listaId === null ? Promise.resolve([]) : this.#vezes.opcoesDaLista(sala.id, sala.listaId, vez.id, OPCOES_POR_VEZ);
  }

  async #jogadores(salaId: number): Promise<Participante[]> {
    const pagina = await this.#participantes.listar(salaId, { pagina: 1, porPagina: JOGADORES.maximo });
    return pagina.itens;
  }

  // Devolve se mudou alguma coisa. Quem perguntar ao mesmo tempo tenta a mesma mudança, e o banco aceita só uma.
  // Cada mudança conta da hora em que devia ter acontecido (o fim do prazo), e não de agora: assim, a sala que
  // ficou sem ninguém olhando chega de uma vez só até onde a partida estaria, inclusive até o fim.
  async #darUmPasso(sala: Sala, jogadores: Participante[], vez: RegistroVez | null): Promise<boolean> {
    const agora = this.#agora();
    if (jogadores.length < JOGADORES.minimo) {
      await this.#vezes.encerrarPartida(sala.id);
      return true;
    }
    if (!vez || vez.terminouEm) {
      // A vez que vinha depois desta sumiu, porque quem ia escolher saiu da sala: quem vem agora ganha o tempo inteiro.
      await this.#seguir(sala, jogadores, vez, agora);
      return true;
    }
    const prazo = prazoDaVez(vez, sala.segundosPorRodada, agora);
    const acabouOTempo = prazo !== null && agora >= prazo;
    switch (faseDaVez(vez, agora)) {
      case "escolhendo":
        if (acabouOTempo) {
          await this.#vezes.escolherPalavra(vez.id, await this.#sortear(sala, vez), prazo);
        }
        return acabouOTempo;
      case "adivinhando": {
        const chutes = new ChutesDaVez(vez.palavra ?? "", adivinhadores(jogadores, vez), await this.#vezes.letras(vez.id));
        if (!acabouOTempo && !chutes.todosTerminaram) {
          return false;
        }
        const terminouEm = acabouOTempo ? prazo : agora;
        await this.#vezes.terminar(vez.id, terminouEm, chutes.pontos(vez.escolhedorId));
        await this.#seguir(sala, jogadores, { ...vez, terminouEm }, terminouEm);
        return true;
      }
      default:
        return false;
    }
  }

  async #seguir(sala: Sala, jogadores: Participante[], anterior: RegistroVez | null, naoAntesDe: Date): Promise<void> {
    const seguinte = proximaVez(anterior, jogadores.map((jogador) => jogador.id), sala.rodadas, naoAntesDe);
    await (seguinte ? this.#vezes.criar(sala.id, seguinte) : this.#vezes.encerrarPartida(sala.id));
  }

  // Quem estava na vez não escolheu a tempo: sai a primeira opção da lista ou uma palavra oficial.
  async #sortear(sala: Sala, vez: RegistroVez): Promise<PalavraEscolhida> {
    const [opcao] = await this.opcoes(sala, vez);
    const sorteada = opcao ? { palavra: opcao.palavra, dica: opcao.dica } : await this.#vezes.sortearPalavraOficial(sala.id);
    if (!sorteada) {
      throw new Error("Não há palavras oficiais para sortear.");
    }
    return sorteada;
  }
}
