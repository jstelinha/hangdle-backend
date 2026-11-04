import type { Email } from "../dominio/Email.js";
import type { Usuario } from "../dominio/Usuario.js";
import { ErroConflito } from "../erros/ErroAplicacao.js";

export interface RepositorioUsuarios {
  inserir(usuario: Usuario): Promise<Usuario>;
  buscarPorEmail(email: Email): Promise<Usuario | null>;
  buscarPorId(id: number): Promise<Usuario | null>;
  atualizar(id: number, usuario: Usuario): Promise<void>;
}

export type CampoUnico = "email" | "cpf";

const MENSAGENS_DUPLICIDADE: Record<CampoUnico, string> = {
  email: "Este e-mail já está cadastrado.",
  cpf: "Este CPF já está cadastrado.",
};

export function erroDuplicidade(campo: CampoUnico): ErroConflito {
  return new ErroConflito(MENSAGENS_DUPLICIDADE[campo], { [campo]: MENSAGENS_DUPLICIDADE[campo] });
}
