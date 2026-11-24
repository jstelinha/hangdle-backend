import { Cpf } from "../../src/dominio/Cpf.js";
import { Email } from "../../src/dominio/Email.js";
import { Nome } from "../../src/dominio/Nome.js";
import { Senha } from "../../src/dominio/Senha.js";
import { Usuario, type RegistroUsuario } from "../../src/dominio/Usuario.js";
import { erroDuplicidade, type RepositorioUsuarios } from "../../src/repositorios/RepositorioUsuarios.js";

export class RepositorioUsuariosMemoria implements RepositorioUsuarios {
  readonly #registros: RegistroUsuario[] = [];

  async inserir(usuario: Usuario): Promise<Usuario> {
    const registro = usuario.paraPersistencia();
    if (this.#registros.some((existente) => existente.email === registro.email)) {
      throw erroDuplicidade("email");
    }
    if (this.#registros.some((existente) => existente.cpf === registro.cpf)) {
      throw erroDuplicidade("cpf");
    }
    this.#registros.push(registro);
    return usuario.comId(this.#registros.length);
  }

  async buscarPorEmail(email: Email): Promise<Usuario | null> {
    return this.buscarPorId(this.#registros.findIndex((registro) => registro.email === email.endereco) + 1);
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const registro = this.#registros[id - 1];
    if (!registro) {
      return null;
    }
    return new Usuario({
      id,
      nome: new Nome(registro.nome),
      email: new Email(registro.email),
      cpf: new Cpf(registro.cpf),
      senha: Senha.aPartirDoHash(registro.senhaHash),
    });
  }

  async atualizar(id: number, usuario: Usuario): Promise<void> {
    const registro = usuario.paraPersistencia();
    if (this.#registros.some((existente, indice) => indice !== id - 1 && existente.cpf === registro.cpf)) {
      throw erroDuplicidade("cpf");
    }
    this.#registros[id - 1] = registro;
  }

  get registros(): readonly RegistroUsuario[] {
    return this.#registros;
  }
}
