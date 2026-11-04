import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { ExecutorSql } from "../banco/conexao.js";
import { Cpf } from "../dominio/Cpf.js";
import { Email } from "../dominio/Email.js";
import { Nome } from "../dominio/Nome.js";
import { Senha } from "../dominio/Senha.js";
import { Usuario } from "../dominio/Usuario.js";
import { erroDuplicidade, type CampoUnico, type RepositorioUsuarios } from "./RepositorioUsuarios.js";

type LinhaUsuario = RowDataPacket & {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  senha_hash: string;
};

const INDICES_UNICOS: Record<string, CampoUnico> = {
  uq_usuarios_email: "email",
  uq_usuarios_cpf: "cpf",
};

function campoDuplicado(erro: unknown): CampoUnico | null {
  if (typeof erro !== "object" || erro === null || !("code" in erro) || erro.code !== "ER_DUP_ENTRY") {
    return null;
  }
  const mensagem = "sqlMessage" in erro && typeof erro.sqlMessage === "string" ? erro.sqlMessage : "";
  const indice = Object.keys(INDICES_UNICOS).find((nome) => mensagem.includes(nome));
  return indice ? (INDICES_UNICOS[indice] ?? null) : null;
}

export class RepositorioUsuariosMysql implements RepositorioUsuarios {
  readonly #banco: ExecutorSql;

  constructor(banco: ExecutorSql) {
    this.#banco = banco;
  }

  async inserir(usuario: Usuario): Promise<Usuario> {
    const registro = usuario.paraPersistencia();
    try {
      const [resultado] = await this.#banco.execute<ResultSetHeader>(
        "INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (?, ?, ?, ?)",
        [registro.nome, registro.email, registro.cpf, registro.senhaHash],
      );
      return usuario.comId(resultado.insertId);
    } catch (erro) {
      const campo = campoDuplicado(erro);
      throw campo ? erroDuplicidade(campo) : erro;
    }
  }

  async buscarPorEmail(email: Email): Promise<Usuario | null> {
    const [linhas] = await this.#banco.execute<LinhaUsuario[]>(
      "SELECT id, nome, email, cpf, senha_hash FROM usuarios WHERE email = ? LIMIT 1",
      [email.endereco],
    );
    const linha = linhas[0];
    if (!linha) {
      return null;
    }
    return new Usuario({
      id: linha.id,
      nome: new Nome(linha.nome),
      email: new Email(linha.email),
      cpf: new Cpf(linha.cpf),
      senha: Senha.aPartirDoHash(linha.senha_hash),
    });
  }
}
