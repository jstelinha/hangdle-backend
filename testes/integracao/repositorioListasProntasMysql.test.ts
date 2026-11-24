import type { Connection } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RepositorioListasMysql } from "../../src/repositorios/RepositorioListasMysql.js";
import { RepositorioListasProntasMysql } from "../../src/repositorios/RepositorioListasProntasMysql.js";
import { RepositorioPalavrasDasListasMysql } from "../../src/repositorios/RepositorioPalavrasDasListasMysql.js";
import { ServicoListasProntas } from "../../src/servicos/ServicoListasProntas.js";
import { conectarBancoDeTeste, esvaziarTabelasDoJogo } from "../apoio/conexaoTeste.js";
import { inserirUsuario } from "../apoio/dadosDoJogo.js";

// As listas prontas vêm do mysql/10-listas-prontas.sql e não são apagadas entre os testes: elas são o próprio dado
// que o teste confere. A cópia vai para as tabelas do jogo, que cada teste esvazia e desfaz no fim.
let conexao: Connection;
let repositorio: RepositorioListasProntasMysql;
let servico: ServicoListasProntas;
let larissa: number;

const NOMES = ["Animais", "Comidas", "Cores", "Esportes", "Frutas", "Objetos da casa", "Países", "Profissões"];

beforeAll(async () => {
  conexao = await conectarBancoDeTeste();
  repositorio = new RepositorioListasProntasMysql(conexao);
  servico = new ServicoListasProntas(repositorio, new RepositorioListasMysql(conexao), new RepositorioPalavrasDasListasMysql(conexao));
});

afterAll(async () => {
  await conexao.end();
});

beforeEach(async () => {
  await conexao.beginTransaction();
  await esvaziarTabelasDoJogo(conexao);
  await conexao.query("DELETE FROM usuarios");
  larissa = await inserirUsuario(conexao);
});

afterEach(async () => {
  await conexao.rollback();
});

describe("listas prontas no MySQL", () => {
  it("as 8 listas prontas, em ordem de nome, com 20 palavras cada", async () => {
    const listas = await repositorio.listar();

    expect(listas.map((lista) => lista.nome)).toEqual(NOMES);
    expect(listas.every((lista) => lista.totalDePalavras === 20)).toBe(true);
  });

  it("busca a lista pronta com as palavras e as dicas, com acento, espaço e hífen", async () => {
    const animais = await repositorio.buscarComPalavras(1);

    expect(animais?.nome).toBe("Animais");
    expect(animais?.palavras).toHaveLength(20);
    expect(animais?.palavras).toContainEqual({ palavra: "LOBO-GUARÁ", dica: "Aparece na nota de duzentos reais" });
    expect(await repositorio.buscarComPalavras(999)).toBeNull();
  });

  it("toda lista pronta cabe nas listas da pessoa: as palavras passam pelas travas de palavras_das_listas", async () => {
    for (const { id } of await repositorio.listar()) {
      const copia = await servico.copiar(larissa, id);

      expect(copia.totalDePalavras).toBe(20);
    }
    const [linhas] = await conexao.query("SELECT COUNT(*) AS total FROM palavras_das_listas");
    expect(linhas).toEqual([{ total: 160 }]);
  });
});
