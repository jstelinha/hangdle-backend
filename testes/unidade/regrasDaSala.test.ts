import { describe, expect, it } from "vitest";
import { ChutesDaVez } from "../../src/dominio/ChutesDaVez.js";
import { PartidaNaSala } from "../../src/dominio/PartidaNaSala.js";
import { faseDaVez, prazoDaVez, proximaVez, segundosRestantes, type RegistroVez } from "../../src/dominio/Vez.js";
import { ErroConflito, ErroProibido, ErroValidacao } from "../../src/erros/ErroAplicacao.js";

const COMECO = new Date("2026-11-10T15:00:00.000Z");

function depois(segundos: number): Date {
  return new Date(COMECO.getTime() + segundos * 1000);
}

function chutarTodas(partida: PartidaNaSala, letras: string): void {
  for (const letra of letras) {
    partida.chutar(letra);
  }
}

function vez(valores: Partial<RegistroVez> = {}): RegistroVez {
  return {
    id: 1,
    numero: 1,
    rodada: 1,
    escolhedorId: 1,
    palavra: null,
    dica: null,
    comecaEm: COMECO,
    escolhidaEm: null,
    terminouEm: null,
    ...valores,
  };
}

describe("partida na sala", () => {
  it("mostra as letras chutadas com o acento da palavra, e o espaço e o hífen desde o começo", () => {
    const partida = new PartidaNaSala("PÃO-DE AÇÚCAR");

    expect(partida.chutar("A")).toBe(true);
    expect(partida.chutar("Z")).toBe(false);
    expect(partida.casas).toEqual([null, "Ã", null, "-", null, null, " ", "A", null, null, null, "A", null]);
    expect(partida.erros).toBe(1);
  });

  it("dá 100 pontos por acertar, menos 10 por erro, e mais 20 para o primeiro", () => {
    const partida = new PartidaNaSala("ARARA");
    chutarTodas(partida, "ZWAR");

    expect(partida.acertou).toBe(true);
    expect(partida.pontos(false)).toBe(80);
    expect(partida.pontos(true)).toBe(100);
  });

  it("não dá pontos a quem não acertou", () => {
    const partida = new PartidaNaSala("ARARA");
    chutarTodas(partida, "ZWYKLB");

    expect(partida.terminou).toBe(true);
    expect(partida.acertou).toBe(false);
    expect(partida.pontos(true)).toBe(0);
  });

  it("recusa com 400 o que não é letra e com 409 a letra repetida ou depois do fim", () => {
    const partida = new PartidaNaSala("ARARA");
    partida.chutar("A");

    expect(() => partida.chutar("a")).toThrow(ErroValidacao);
    expect(() => partida.chutar("A")).toThrow(ErroConflito);
    expect(() => partida.chutar("A")).toThrow("Você já chutou a letra A.");
    partida.chutar("R");
    expect(() => partida.chutar("B")).toThrow("A sua forca nesta vez já terminou.");
  });
});

describe("chutes da vez", () => {
  const ESCOLHEDOR = 1;
  const BRU = 2;
  const CARLA = 3;

  it("dá o bônus a quem acertou primeiro e 10 pontos a quem escolheu por pessoa que acertou", () => {
    const chutes = new ChutesDaVez("ARARA", [BRU, CARLA], [
      { participanteId: CARLA, letra: "Z" },
      { participanteId: CARLA, letra: "A" },
      { participanteId: BRU, letra: "A" },
      { participanteId: BRU, letra: "R" },
      { participanteId: CARLA, letra: "R" },
    ]);

    expect(chutes.todosTerminaram).toBe(true);
    expect(chutes.pontos(ESCOLHEDOR)).toEqual(
      new Map([
        [BRU, 120],
        [CARLA, 90],
        [ESCOLHEDOR, 20],
      ]),
    );
  });

  it("ignora as letras de quem saiu da sala e as que chegaram depois do fim", () => {
    const chutes = new ChutesDaVez("ARARA", [BRU], [
      { participanteId: CARLA, letra: "A" },
      { participanteId: BRU, letra: "A" },
      { participanteId: BRU, letra: "R" },
      { participanteId: BRU, letra: "Z" },
    ]);

    expect(chutes.partidaDe(BRU)?.erros).toBe(0);
    expect(chutes.partidaDe(CARLA)).toBeNull();
  });

  it("só termina quando todos os que adivinham terminaram", () => {
    const chutes = new ChutesDaVez("ARARA", [BRU, CARLA], []);

    chutes.chutar(BRU, "A");
    chutes.chutar(BRU, "R");
    expect(chutes.todosTerminaram).toBe(false);

    for (const letra of "ZWYKLB") {
      chutes.chutar(CARLA, letra);
    }
    expect(chutes.todosTerminaram).toBe(true);
    expect(new ChutesDaVez("ARARA", [], []).todosTerminaram).toBe(true);
  });

  it("não deixa chutar quem não está adivinhando", () => {
    const chutes = new ChutesDaVez("ARARA", [BRU], []);

    expect(() => chutes.chutar(ESCOLHEDOR, "A")).toThrow(ErroProibido);
  });
});

describe("vez", () => {
  it("passa do intervalo para a escolha, a adivinhação e o fim", () => {
    expect(faseDaVez(vez(), depois(-1))).toBe("intervalo");
    expect(faseDaVez(vez(), COMECO)).toBe("escolhendo");
    expect(faseDaVez(vez({ palavra: "ARARA", escolhidaEm: depois(5) }), depois(6))).toBe("adivinhando");
    expect(faseDaVez(vez({ palavra: "ARARA", escolhidaEm: depois(5), terminouEm: depois(50) }), depois(51))).toBe("terminada");
  });

  it("dá 20 segundos para escolher e o tempo da sala para adivinhar", () => {
    const escolhida = vez({ palavra: "ARARA", escolhidaEm: depois(5) });

    expect(prazoDaVez(vez(), 45, depois(-3))).toEqual(COMECO);
    expect(prazoDaVez(vez(), 45, depois(1))).toEqual(depois(20));
    expect(prazoDaVez(escolhida, 45, depois(6))).toEqual(depois(50));
    expect(segundosRestantes(depois(50), depois(6.2))).toBe(44);
    expect(segundosRestantes(depois(50), depois(60))).toBe(0);
  });

  describe("próxima vez", () => {
    const terminada = (valores: Partial<RegistroVez>) => vez({ palavra: "ARARA", escolhidaEm: COMECO, terminouEm: COMECO, ...valores });

    it("começa por quem entrou primeiro", () => {
      expect(proximaVez(null, [7, 3, 5], 2, COMECO)).toEqual({ numero: 1, rodada: 1, escolhedorId: 3, comecaEm: COMECO });
    });

    it("passa para o próximo da fila, 5 segundos depois do fim da anterior", () => {
      expect(proximaVez(terminada({ escolhedorId: 3 }), [3, 5, 7], 2, depois(1))).toEqual({
        numero: 2,
        rodada: 1,
        escolhedorId: 5,
        comecaEm: depois(5),
      });
    });

    it("volta para o primeiro na rodada seguinte e acaba depois da última", () => {
      expect(proximaVez(terminada({ numero: 3, escolhedorId: 7 }), [3, 5, 7], 2, COMECO)).toMatchObject({
        numero: 4,
        rodada: 2,
        escolhedorId: 3,
      });
      expect(proximaVez(terminada({ numero: 6, rodada: 2, escolhedorId: 7 }), [3, 5, 7], 2, COMECO)).toBeNull();
    });

    it("pula quem saiu, chama quem chegou no meio e não volta no tempo", () => {
      expect(proximaVez(terminada({ escolhedorId: 3 }), [3, 7, 9], 1, depois(60))).toEqual({
        numero: 2,
        rodada: 1,
        escolhedorId: 7,
        comecaEm: depois(60),
      });
      expect(proximaVez(terminada({ escolhedorId: 7 }), [3, 7, 9], 1, COMECO)).toMatchObject({ escolhedorId: 9 });
    });
  });
});
