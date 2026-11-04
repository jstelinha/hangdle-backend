# Hangdle — back-end

API do Hangdle, um jogo da forca no estilo do Termo. Projeto da Tech Academy de
Gabriel Zafani e Julia Stela.

Node 24 + TypeScript + Express + MySQL 8.4. O front-end fica em
[hangdle-frontend](https://github.com/jstelinha/hangdle-frontend).

## Onde está cada item da rubrica

Todo trecho que atende um item da rubrica tem um comentário de marcação, sempre
no mesmo formato:

```text
// Rubrica de <Disciplina> - <Critério> - <Requisito>
```

Para ver todas as marcações de uma vez, busque pelo texto `Rubrica de`:

- **no GitHub:** aperte `.` na página do repositório (abre o editor no
  navegador) e use a busca (`Ctrl+Shift+F`);
- **no VS Code:** `Ctrl+Shift+F` com a pasta do projeto aberta;
- **no terminal:** `git grep -n "Rubrica de"`.

### Sprint 1

| Item da rubrica | Onde está | Teste que comprova |
|---|---|---|
| **Back-end · Cadastro de Usuário** · campos obrigatórios: nome, email, senha, CPF | `src/servicos/ServicoCadastro.ts`, `src/esquemas/usuario.ts`, `mysql/01-usuarios.sql` | `testes/unidade/cadastro.test.ts` |
| **Back-end · Cadastro de Usuário** · validação de CPF | `src/dominio/Cpf.ts`; o banco também recusa, com um gatilho em `mysql/01-usuarios.sql` | `testes/unidade/cpf.test.ts`, `testes/integracao/repositorioUsuariosMysql.test.ts` |
| **Back-end · Cadastro de Usuário** · validação de nível de senha | `src/dominio/Senha.ts` | `testes/unidade/senha.test.ts` |
| **Back-end · Cadastro de Usuário** · validação de email | `src/dominio/Email.ts`, `mysql/01-usuarios.sql` | `testes/unidade/email.test.ts` |
| **Tech Forge · Encapsulamento e Proteção do Estado** | Campos privados `#` em `src/dominio/Cpf.ts`; construtor privado em `src/dominio/Senha.ts` (só nasce por `Senha.criar`, que valida e criptografa) | `testes/unidade/cpf.test.ts`, `testes/unidade/senha.test.ts` |
| **Tech Forge · Acesso Controlado e Propriedades** | `get` só onde há regra, em `src/dominio/Email.ts`; `src/dominio/Usuario.ts` não expõe CPF nem hash | `testes/unidade/cadastro.test.ts` |

### Adiantado da Sprint 2

| Item da rubrica | Onde está | Teste que comprova |
|---|---|---|
| **Back-end · Autenticação** · login, senha criptografada, regex de e-mail, JWT, só usuário existente | `src/servicos/ServicoAutenticacao.ts`, `src/dominio/Senha.ts`, `src/dominio/Email.ts` | `testes/unidade/login.test.ts` |

### Exigências da disciplina

| Exigência | Onde está |
|---|---|
| Docker | `Dockerfile`, `docker-compose.yml` |
| nginx | `nginx.conf` |
| zod | `src/esquemas/usuario.ts` |
| Testes automáticos | `testes/` e `.github/workflows/testes.yml` |

## Onde o Node.js é usado

- **A API inteira roda em Node.js 24.** `src/server.ts` liga o servidor Express
  (`app.listen`) e `src/app.ts` monta as rotas.
- **Recursos do próprio Node:** `node:crypto` em
  `src/servicos/ServicoAutenticacao.ts`, `Buffer` em `src/dominio/Senha.ts` e
  `process.env` em `src/config/ambiente.ts`.
- **Para rodar:** `npm start` executa `node dist/server.js`. O `Dockerfile` parte
  da imagem `node:24-alpine`.

## Rodar tudo com Docker

Os dois repositórios precisam estar lado a lado na mesma pasta:

```text
uma-pasta-qualquer/
├── hangdle-backend/    ← este repositório (tem o docker-compose.yml)
└── hangdle-frontend/
```

1. Copie `.env.example` para `.env` e troque as senhas e o `JWT_SEGREDO` (pelo
   menos 32 caracteres). O `.env` não vai para o git.
2. Na pasta `hangdle-backend`, rode `docker compose up -d --build`.
3. Abra `http://localhost`. A API responde pelo nginx em `http://localhost/api/`
   (por exemplo, `http://localhost/api/saude`).

O comando sobe um projeto chamado `cade` com quatro containers:

| Container | O que roda |
|---|---|
| `hangdle_mysql` | MySQL 8.4. Na primeira subida, cria as tabelas sozinho com os arquivos da pasta `mysql/`. |
| `hangdle_backend` | Esta API, na porta 3000, aberta só para este computador (`127.0.0.1:3000`). De outra máquina, a API só é acessível pelo nginx. Só liga depois que o MySQL responde. |
| `hangdle_frontend` | O front (Vite), que vem de `../hangdle-frontend`. |
| `hangdle_nginx` | A porta de entrada, na porta 80: `/` vai para o front e `/api/` vai para a API. |

Todos têm `restart: always`, então voltam sozinhos quando o Docker é ligado de
novo.

O MySQL fica em `127.0.0.1:3306`, aberto só para este computador. No DBeaver, use
o usuário e a senha do `.env` e ligue `allowPublicKeyRetrieval=true`.

### Banco de dados

O SQL fica em arquivos numerados na pasta `mysql/`, um por assunto:

| Arquivo | O que cria |
|---|---|
| `01-usuarios.sql` | Usuários, com as travas de e-mail, CPF e senha |
| `02-palavras.sql` | Categorias e palavras. Cada palavra pertence a uma categoria, fica em maiúsculas e não se repete, nem trocando só os acentos. |
| `03-palavras-iniciais.sql` | As 60 primeiras palavras, em 6 categorias |
| `04-palavras-do-dia.sql` | Qual palavra saiu em cada dia |

Na primeira subida, o MySQL roda todos, em ordem. Depois disso ele não roda mais nenhum, então
um arquivo novo precisa ser aplicado à mão num banco que já existe. Por exemplo,
para o `02-palavras.sql`:

```bash
docker exec -i hangdle_mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < mysql/02-palavras.sql
```

Para recriar o banco do zero com todos os arquivos, rode `docker compose down -v`
(apaga todos os dados).

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/usuarios` | Cadastro: `nome`, `email`, `cpf`, `senha`. Devolve `201` com `id`, `nome` e `email`. |
| `POST` | `/login` | Login: `email`, `senha`. Devolve `200` com `token` (JWT) e `usuario`. |
| `GET` | `/saude` | Diz se a API e o banco estão no ar. |
| `GET` | `/palavra-do-dia` | A palavra do dia, igual para todo mundo: `dia`, `palavra` e `categoria`. |

### Palavra do dia

O dia vale pelo horário de Brasília e troca à meia-noite. No primeiro pedido do
dia, a API sorteia uma palavra que nunca saiu; quando todas já saíram, volta a
que saiu há mais tempo. O sorteio fica guardado em `palavras_do_dia`, então quem
abrir o jogo no mesmo dia recebe a mesma palavra.

Pelo nginx, as rotas ganham `/api` na frente: `/api/login` chega na API como
`/login`. A API confia só no nginx para saber o IP de quem chamou, e é por esse
IP que ela conta as tentativas de cadastro e login.

Os erros voltam como `{ "mensagem": "...", "campos": { "campo": "..." } }`, em
português.

## Testes

```bash
npm test                 # unidade e ataques, sem banco
npm run test:integracao  # precisa do MySQL do docker compose no ar
```

Os dois rodam no GitHub Actions a cada publicação.
