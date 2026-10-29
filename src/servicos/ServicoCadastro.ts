import { Cpf } from "../dominio/Cpf.js";
import { Email } from "../dominio/Email.js";
import { Nome } from "../dominio/Nome.js";
import { Senha } from "../dominio/Senha.js";
import { Usuario, type UsuarioPublico } from "../dominio/Usuario.js";
import type { DadosCadastro } from "../esquemas/usuario.js";
import type { RepositorioUsuarios } from "../repositorios/RepositorioUsuarios.js";

export class ServicoCadastro {
  readonly #usuarios: RepositorioUsuarios;

  constructor(usuarios: RepositorioUsuarios) {
    this.#usuarios = usuarios;
  }

  // Rubrica de Back-end - Cadastro de Usuário - Cadastro com os campos obrigatórios: nome, email, senha, CPF
  async cadastrar(dados: DadosCadastro): Promise<UsuarioPublico> {
    const usuario = new Usuario({
      nome: new Nome(dados.nome),
      email: new Email(dados.email),
      cpf: new Cpf(dados.cpf),
      senha: await Senha.criar(dados.senha),
    });
    const salvo = await this.#usuarios.inserir(usuario);
    return salvo.paraResposta();
  }
}
