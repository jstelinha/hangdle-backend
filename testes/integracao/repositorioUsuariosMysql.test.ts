import mysql, { type Connection } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Cpf } from "../../src/dominio/Cpf.js";
import { Email } from "../../src/dominio/Email.js";
import { Nome } from "../../src/dominio/Nome.js";
import { Senha } from "../../src/dominio/Senha.js";
import { Usuario } from "../../src/dominio/Usuario.js";
import { ErroConflito } from "../../src/erros/ErroAplicacao.js";
import { RepositorioUsuariosMysql } from "../../src/repositorios/RepositorioUsuariosMysql.js";

const HASH_VALIDO = "$2b$12$abcdefghijklmnopqrstuuMRjZ7c0Y3x5r4H9Fh7wJxX2nXxXxXxX";

let conexao: Connection;
let senha: Senha;

async function usuario(email: string, cpf: string) {
  return new Usuario({ nome: new Nome("Larissa Souza"), email: new Email(email), cpf: new Cpf(cpf), senha });
}

async function inserirDireto(valores: { nome?: string; email?: string; cpf?: string; senhaHash?: string }) {
  await conexao.execute("INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (?, ?, ?, ?)", [
    valores.nome ?? "Larissa Souza",
    valores.email ?? "direto@exemplo.com",
    valores.cpf ?? "52998224725",
    valores.senhaHash ?? HASH_VALIDO,
  ]);
}

beforeAll(async () => {
  conexao = await mysql.createConnection({
    host: process.env.TESTE_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  senha = await Senha.criar("Hangdle#2026");
});

afterAll(async () => {
  await conexao.end();
});

beforeEach(async () => {
  await conexao.beginTransaction();
});

afterEach(async () => {
  await conexao.rollback();
});

describe("repositório de usuários no MySQL", () => {
  it("salva e encontra o usuário pelo e-mail", async () => {
    const repositorio = new RepositorioUsuariosMysql(conexao);

    const salvo = await repositorio.inserir(await usuario("larissa.teste@exemplo.com", "529.982.247-25"));
    const encontrado = await repositorio.buscarPorEmail(new Email("LARISSA.TESTE@exemplo.com"));

    expect(encontrado?.paraResposta()).toEqual(salvo.paraResposta());
    expect(salvo.paraResposta()).toMatchObject({ nome: "Larissa Souza", email: "larissa.teste@exemplo.com" });
    expect(await encontrado?.conferirSenha("Hangdle#2026")).toBe(true);
  });

  it("traduz o e-mail repetido recusado pelo banco", async () => {
    const repositorio = new RepositorioUsuariosMysql(conexao);
    await repositorio.inserir(await usuario("larissa.teste@exemplo.com", "529.982.247-25"));

    const repetido = repositorio.inserir(await usuario("larissa.teste@exemplo.com", "111.444.777-35"));

    await expect(repetido).rejects.toBeInstanceOf(ErroConflito);
    await expect(repetido).rejects.toMatchObject({ campos: { email: "Este e-mail já está cadastrado." } });
  });

  it("traduz o CPF repetido recusado pelo banco", async () => {
    const repositorio = new RepositorioUsuariosMysql(conexao);
    await repositorio.inserir(await usuario("larissa.teste@exemplo.com", "529.982.247-25"));

    const repetido = repositorio.inserir(await usuario("outra.teste@exemplo.com", "52998224725"));

    await expect(repetido).rejects.toMatchObject({ campos: { cpf: "Este CPF já está cadastrado." } });
  });
});

describe("travas do próprio banco", () => {
  it.each(["52998224725", "11144477735"])("aceita o CPF válido %s", async (cpf) => {
    await expect(inserirDireto({ cpf })).resolves.toBeUndefined();
  });

  it.each([
    ["dígito verificador errado", { cpf: "52998224724" }, "CPF invalido"],
    ["CPF com todos os dígitos iguais", { cpf: "11111111111" }, "CPF invalido"],
    ["e-mail com maiúscula", { email: "Direto@exemplo.com" }, "ck_usuarios_email_minusculo"],
    ["e-mail sem domínio", { email: "direto@exemplo" }, "ck_usuarios_email_formato"],
    ["senha sem criptografia", { senhaHash: "Hangdle#2026" }, "ck_usuarios_senha_bcrypt"],
    ["nome curto", { nome: "Al" }, "ck_usuarios_nome"],
  ])("recusa %s mesmo inserindo direto", async (_caso, valores, motivo) => {
    await expect(inserirDireto(valores)).rejects.toThrow(motivo);
  });

  it("recusa trocar o CPF por um inválido", async () => {
    await inserirDireto({});

    await expect(conexao.execute("UPDATE usuarios SET cpf = '11111111111' WHERE email = 'direto@exemplo.com'")).rejects.toThrow(
      "CPF invalido",
    );
  });
});
