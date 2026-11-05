import { Cpf } from "../dominio/Cpf.js";
import { Nome } from "../dominio/Nome.js";
import { Senha } from "../dominio/Senha.js";
import type { PerfilUsuario, Usuario, UsuarioPublico } from "../dominio/Usuario.js";
import { ErroNaoEncontrado, ErroProibido } from "../erros/ErroAplicacao.js";
import type { DadosEdicao } from "../esquemas/usuario.js";
import type { RepositorioUsuarios } from "../repositorios/RepositorioUsuarios.js";

export class ServicoPerfil {
  readonly #usuarios: RepositorioUsuarios;

  constructor(usuarios: RepositorioUsuarios) {
    this.#usuarios = usuarios;
  }

  async buscar(idLogado: number, id: number): Promise<PerfilUsuario> {
    const usuario = await this.#encontrarOProprio(idLogado, id);
    return usuario.paraPerfil();
  }

  async editar(idLogado: number, id: number, dados: DadosEdicao): Promise<UsuarioPublico> {
    const atual = await this.#encontrarOProprio(idLogado, id);
    const editado = atual.editado({
      nome: new Nome(dados.nome),
      cpf: new Cpf(dados.cpf),
      senha: await Senha.criar(dados.senha),
    });
    await this.#usuarios.atualizar(id, editado);
    return editado.paraResposta();
  }

  // Rubrica de Back-end - Edição de Usuário - Só pode editar o próprio usuário
  async #encontrarOProprio(idLogado: number, id: number): Promise<Usuario> {
    if (idLogado !== id) {
      throw new ErroProibido("Você só pode ver e editar a sua própria conta.");
    }
    const usuario = await this.#usuarios.buscarPorId(id);
    if (!usuario) {
      throw new ErroNaoEncontrado("Usuário não encontrado.");
    }
    return usuario;
  }
}
