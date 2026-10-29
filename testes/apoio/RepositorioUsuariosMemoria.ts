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
    const indice = this.#registros.findIndex((registro) => registro.email === email.endereco);
    const registro = this.#registros[indice];
    if (!registro) {
      return null;
    }
    return new Usuario({
      id: indice + 1,
      nome: new Nome(registro.nome),
      email: new Email(registro.email),
      cpf: new Cpf(registro.cpf),
      senha: Senha.aPartirDoHash(registro.senhaHash),
    });
  }

  get registros(): readonly RegistroUsuario[] {
    return this.#registros;
  }
}
