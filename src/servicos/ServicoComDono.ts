import { ErroNaoEncontrado, ErroProibido } from "../erros/ErroAplicacao.js";

// Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Classe abstrata: cada CRUD diz como achar o recurso e de quem ele é
export abstract class ServicoComDono<Recurso> {
  protected abstract readonly naoEncontrado: string;
  protected abstract readonly deOutraPessoa: string;

  protected abstract buscarPorId(id: number): Promise<Recurso | null>;
  protected abstract pertenceA(recurso: Recurso, usuarioId: number): boolean;

  // Rubrica de Back-end - Cruds Completos - Não editar/deletar recursos que não existem
  protected async encontrarDoUsuario(usuarioId: number, id: number): Promise<Recurso> {
    const recurso = await this.buscarPorId(id);
    if (!recurso) {
      throw new ErroNaoEncontrado(this.naoEncontrado);
    }
    if (!this.pertenceA(recurso, usuarioId)) {
      throw new ErroProibido(this.deOutraPessoa);
    }
    return recurso;
  }
}
