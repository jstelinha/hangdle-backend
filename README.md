# Hangdle — back-end

API do Hangdle, um jogo da forca no estilo do Termo. Projeto da Tech Academy de
Gabriel Zafani e Julia Stela.

Node 24 + TypeScript + Express + MySQL 8.4. O front-end fica em
[cade-frontend](https://github.com/jstelinha/cade-frontend).

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
| **Back-end · Cadastro de Usuário** · campos obrigatórios: nome, email, senha, CPF | `src/servicos/ServicoCadastro.ts`, `src/esquemas/usuario.ts`, `mysql/init.sql` | `testes/unidade/cadastro.test.ts` |
| **Back-end · Cadastro de Usuário** · validação de CPF | `src/dominio/Cpf.ts`; o banco também recusa, com um gatilho em `mysql/init.sql` | `testes/unidade/cpf.test.ts`, `testes/integracao/repositorioUsuariosMysql.test.ts` |
| **Back-end · Cadastro de Usuário** · validação de nível de senha | `src/dominio/Senha.ts` | `testes/unidade/senha.test.ts` |
| **Back-end · Cadastro de Usuário** · validação de email | `src/dominio/Email.ts`, `mysql/init.sql` | `testes/unidade/email.test.ts` |
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
cade/
├── cade-backend/   ← este repositório (tem o docker-compose.yml)
└── cade-frontend/
```

1. Copie `.env.example` para `.env` e troque as senhas e o `JWT_SEGREDO` (pelo
   menos 32 caracteres). O `.env` não vai para o git.
2. Na pasta `cade-backend`, rode `docker compose up -d --build`.
3. Abra `http://localhost`. A API responde em `http://localhost:3000`.

O comando sobe um projeto chamado `cade` com quatro containers:

| Container | O que roda |
|---|---|
| `hangdle_mysql` | MySQL 8.4. Na primeira subida, cria as tabelas sozinho com o `mysql/init.sql`. |
| `hangdle_backend` | Esta API, na porta 3000. Só liga depois que o MySQL responde. |
| `hangdle_frontend` | O front (Vite), que vem de `../cade-frontend`. |
| `hangdle_nginx` | A porta de entrada, na porta 80: `/` vai para o front e `/api/` vai para a API. |

Todos têm `restart: always`, então voltam sozinhos quando o Docker é ligado de
novo.

O MySQL fica em `127.0.0.1:3306`, aberto só para este computador. No DBeaver, use
o usuário e a senha do `.env` e ligue `allowPublicKeyRetrieval=true`.

Na primeira subida, o MySQL roda o `mysql/init.sql`. Para recriar o banco do
zero, rode `docker compose down -v` (apaga todos os dados).

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/usuarios` | Cadastro: `nome`, `email`, `cpf`, `senha`. Devolve `201` com `id`, `nome` e `email`. |
| `POST` | `/login` | Login: `email`, `senha`. Devolve `200` com `token` (JWT) e `usuario`. |
| `GET` | `/saude` | Diz se a API e o banco estão no ar. |

Os erros voltam como `{ "mensagem": "...", "campos": { "campo": "..." } }`, em
português.

## Testes

```bash
npm test                 # unidade e ataques, sem banco
npm run test:integracao  # precisa do MySQL do docker compose no ar
```

Os dois rodam no GitHub Actions a cada publicação.
