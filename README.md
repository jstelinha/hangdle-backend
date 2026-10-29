# Hangdle — back-end

API do Hangdle, um jogo da forca no estilo do Termo. Projeto da Tech Academy de
Gabriel Zafani e Julia Stela.

Node 24 + TypeScript + Express + MySQL 8.4. O front-end fica em
[cade-frontend](https://github.com/jstelinha/cade-frontend).

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
