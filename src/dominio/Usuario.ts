import type { Cpf } from "./Cpf.js";
import type { Email } from "./Email.js";
import type { Nome } from "./Nome.js";
import type { Senha } from "./Senha.js";

export type UsuarioPublico = {
  id: number;
  nome: string;
  email: string;
};

export type RegistroUsuario = {
  nome: string;
  email: string;
  cpf: string;
  senhaHash: string;
};

type DadosUsuario = {
  id?: number;
  nome: Nome;
  email: Email;
  cpf: Cpf;
  senha: Senha;
};

export class Usuario {
  readonly #id: number | null;
  readonly #nome: Nome;
  readonly #email: Email;
  readonly #cpf: Cpf;
  readonly #senha: Senha;

  constructor({ id, nome, email, cpf, senha }: DadosUsuario) {
    this.#id = id ?? null;
    this.#nome = nome;
    this.#email = email;
    this.#cpf = cpf;
    this.#senha = senha;
  }

  comId(id: number): Usuario {
    return new Usuario({ id, nome: this.#nome, email: this.#email, cpf: this.#cpf, senha: this.#senha });
  }

  conferirSenha(textoPuro: string): Promise<boolean> {
    return this.#senha.confere(textoPuro);
  }

  paraPersistencia(): RegistroUsuario {
    return {
      nome: this.#nome.texto,
      email: this.#email.endereco,
      cpf: this.#cpf.digitos,
      senhaHash: this.#senha.hash,
    };
  }

  // Rubrica de Tech Forge - Acesso Controlado e Propriedades - Não expor atributos de forma desnecessária
  paraResposta(): UsuarioPublico {
    if (this.#id === null) {
      throw new Error("Usuário ainda não foi salvo no banco.");
    }
    return { id: this.#id, nome: this.#nome.texto, email: this.#email.endereco };
  }
}
