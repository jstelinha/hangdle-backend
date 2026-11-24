import { ErroNaoEncontrado, type ErroAplicacao } from "../erros/ErroAplicacao.js";

// O "dono" é quem agrupa os recursos: a pessoa, para as listas; a lista, para as palavras.
// Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Classe abstrata: cada CRUD diz como achar o recurso, quem é o dono e que erro dar
// Rubrica de Tech Forge - Aderência aos Princípios SOLID - Aberto para extensão: cada CRUD novo herda e sobrescreve, sem mudar esta classe
export abstract class ServicoComDono<Recurso> {
  protected abstract readonly naoEncontrado: string;

  protected abstract buscarPorId(id: number): Promise<Recurso | null>;
  protected abstract donoDe(recurso: Recurso): number;
  protected abstract erroDeOutroDono(): ErroAplicacao;

  // Rubrica de Back-end - Cruds Completos - Não editar/deletar recursos que não existem
  protected async encontrarDoDono(donoId: number, id: number): Promise<Recurso> {
    const recurso = await this.buscarPorId(id);
    if (!recurso) {
      throw new ErroNaoEncontrado(this.naoEncontrado);
    }
    if (this.donoDe(recurso) !== donoId) {
      throw this.erroDeOutroDono();
    }
    return recurso;
  }
}
