import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Email } from "../dominio/Email.js";
import { Senha } from "../dominio/Senha.js";
import type { UsuarioPublico } from "../dominio/Usuario.js";
import { ErroCredenciais } from "../erros/ErroAplicacao.js";
import type { DadosLogin } from "../esquemas/usuario.js";
import type { RepositorioUsuarios } from "../repositorios/RepositorioUsuarios.js";

export type ConfiguracaoToken = {
  segredo: string;
  expiracaoSegundos: number;
};

export type Sessao = {
  token: string;
  usuario: UsuarioPublico;
};

const senhaDeQuemNaoExiste = Senha.aPartirDoHash(bcrypt.hashSync(randomUUID(), 12));

export class ServicoAutenticacao {
  readonly #usuarios: RepositorioUsuarios;
  readonly #token: ConfiguracaoToken;

  constructor(usuarios: RepositorioUsuarios, token: ConfiguracaoToken) {
    this.#usuarios = usuarios;
    this.#token = token;
  }

  // Rubrica de Back-end - Autenticação - Login com e-mail e senha
  async entrar(dados: DadosLogin): Promise<Sessao> {
    const usuario = await this.#usuarios.buscarPorEmail(new Email(dados.email));
    const senhaConfere = usuario
      ? await usuario.conferirSenha(dados.senha)
      : await senhaDeQuemNaoExiste.confere(dados.senha).then(() => false);

    // Rubrica de Back-end - Autenticação - Logar apenas usuário existente
    if (!usuario || !senhaConfere) {
      throw new ErroCredenciais("E-mail ou senha incorretos.");
    }

    const publico = usuario.paraResposta();
    // Rubrica de Back-end - Autenticação - Retorno JWT
    const token = jwt.sign({ nome: publico.nome }, this.#token.segredo, {
      subject: String(publico.id),
      expiresIn: this.#token.expiracaoSegundos,
      algorithm: "HS256",
    });
    return { token, usuario: publico };
  }
}
