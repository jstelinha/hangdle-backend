import type { RowDataPacket } from "mysql2/promise";
import type { ExecutorSql } from "../banco/conexao.js";
import type { ListaPronta, ListaProntaComPalavras } from "../dominio/ListaPronta.js";
import type { RepositorioListasProntas } from "./RepositorioListasProntas.js";

type LinhaListaPronta = RowDataPacket & { id: number; nome: string; totalDePalavras: number | string };
type LinhaPalavraPronta = RowDataPacket & { palavra: string; dica: string | null };

const SELECIONAR = `
  SELECT l.id, l.nome,
         (SELECT COUNT(*) FROM palavras_das_listas_prontas p WHERE p.lista_pronta_id = l.id) AS totalDePalavras
  FROM listas_prontas l`;

function converter(linha: LinhaListaPronta): ListaPronta {
  return { id: linha.id, nome: linha.nome, totalDePalavras: Number(linha.totalDePalavras) };
}

export class RepositorioListasProntasMysql implements RepositorioListasProntas {
  readonly #banco: ExecutorSql;

  constructor(banco: ExecutorSql) {
    this.#banco = banco;
  }

  async listar(): Promise<ListaPronta[]> {
    const [linhas] = await this.#banco.execute<LinhaListaPronta[]>(`${SELECIONAR} ORDER BY l.nome, l.id`);
    return linhas.map(converter);
  }

  async buscarComPalavras(id: number): Promise<ListaProntaComPalavras | null> {
    const [linhas] = await this.#banco.execute<LinhaListaPronta[]>(`${SELECIONAR} WHERE l.id = ?`, [id]);
    const linha = linhas[0];
    if (!linha) {
      return null;
    }
    const [palavras] = await this.#banco.execute<LinhaPalavraPronta[]>(
      "SELECT texto AS palavra, dica FROM palavras_das_listas_prontas WHERE lista_pronta_id = ? ORDER BY texto",
      [id],
    );
    return { ...converter(linha), palavras: palavras.map(({ palavra, dica }) => ({ palavra, dica })) };
  }
}
