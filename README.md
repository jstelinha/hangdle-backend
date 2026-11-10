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
| **Tech Forge · Encapsulamento e Proteção do Estado** | Campos privados `#` em `src/dominio/Cpf.ts` e em `src/dominio/ChutesDaVez.ts` (as forcas de todos numa vez só mudam por `chutar`, que também guarda quem acertou primeiro); construtor privado em `src/dominio/Senha.ts` (só nasce por `Senha.criar`, que valida e criptografa) | `testes/unidade/cpf.test.ts`, `testes/unidade/senha.test.ts`, `testes/unidade/regrasDaSala.test.ts` |
| **Tech Forge · Acesso Controlado e Propriedades** | `get` só onde há regra, em `src/dominio/Email.ts`; `src/dominio/Usuario.ts` não expõe CPF nem hash | `testes/unidade/cadastro.test.ts` |

### Adiantado da Sprint 2

| Item da rubrica | Onde está | Teste que comprova |
|---|---|---|
| **Back-end · Autenticação** · login, senha criptografada, regex de e-mail, JWT, só usuário existente | `src/servicos/ServicoAutenticacao.ts`, `src/dominio/Senha.ts`, `src/dominio/Email.ts` | `testes/unidade/login.test.ts` |
| **Back-end · Edição de Usuário** · rota autenticada, só o próprio usuário, todos os campos obrigatórios, validação de CPF e de nível de senha, e-mail sem alteração | `src/rotas/perfil.ts`, `src/servicos/ServicoPerfil.ts`, `src/esquemas/usuario.ts` (`esquemaEdicao`), `src/dominio/Usuario.ts` (`editado` mantém o e-mail) | `testes/unidade/perfil.test.ts`, `testes/integracao/repositorioUsuariosMysql.test.ts` |
| **Back-end · Configuração de Agentes** · `AGENTS.md`, 3 skills, guardrails e proteção do `.env` | `AGENTS.md` (regras e limites do agente); skills em `.claude/skills/` (`nova-tabela-sql`, `nova-rota-da-api`, `conferir-rubrica`); `.claude/settings.json` bloqueia ler ou editar o `.env`, mostrar as variáveis com `printenv`, `docker compose config` ou `docker inspect`, apagar o banco, `push --force` e `reset --hard`, e pede confirmação para `git push` | — |
| **Tech Forge · Tratamento de Exceções** | Erros próprios em `src/erros/ErroAplicacao.ts` (validação, credenciais, proibido, não encontrado, conflito, indisponível), traduzidos em `src/middlewares/tratarErros.ts`; pastas por papel: `dominio/`, `servicos/`, `repositorios/`, `rotas/`, `esquemas/`, `middlewares/` e `erros/` | `testes/unidade/perfil.test.ts`, `testes/unidade/invasao.test.ts` |
| **Tech Forge · Aderência aos Princípios SOLID** | **S:** a rota só valida e responde (`src/rotas/`), a regra fica no serviço (`src/servicos/`) e o SQL no repositório (`src/repositorios/`). **O:** um CRUD novo herda de `src/servicos/ServicoComDono.ts` e `src/repositorios/RepositorioMysql.ts` sem mudar as duas; a partida na sala entrou herdando de `src/dominio/Partida.ts` sem mudar a partida diária. **L:** `PartidaDiaria` e `PartidaNaSala` mantêm o contrato de `Partida`; `Senha` e `SenhaDaSala` conferem o hash como `SenhaCriptografada`; os repositórios em memória (`testes/apoio/`) entram no lugar dos do MySQL sem o serviço perceber. **D:** os serviços dependem das interfaces dos repositórios, e quem escolhe a implementação é `src/server.ts` (MySQL) ou `testes/apoio/criarAppTeste.ts` (memória) | Os testes de unidade rodam os serviços com os repositórios em memória; `testes/integracao/repositorio*Mysql.test.ts` provam os do MySQL; `testes/unidade/partidaDiaria.test.ts` e `testes/unidade/regrasDaSala.test.ts` |
| **Back-end · Cruds Completos** · 4 CRUDs completos (sem contar o de usuários), todos com as rotas autenticadas | Listas (`src/rotas/listas.ts`), palavras das listas (`src/rotas/palavrasDasListas.ts`), salas (`src/rotas/salas.ts`) e participantes (`src/rotas/participantes.ts`) | `testes/unidade/listas.test.ts`, `testes/unidade/palavrasDasListas.test.ts`, `testes/unidade/salas.test.ts`, `testes/unidade/participantes.test.ts` |
| **Back-end · Cruds Completos** · paginação das listagens | `src/esquemas/paginacao.ts` (`?pagina=` e `?porPagina=`), `src/repositorios/RepositorioMysql.ts` (`listarPagina`, usado pelos 4 CRUDs) | `testes/unidade/paginacao.test.ts`, `testes/integracao/repositorioListasMysql.test.ts`, `testes/integracao/repositorioSalasMysql.test.ts` |
| **Back-end · Cruds Completos** · não editar/deletar recursos que não existem | `src/servicos/ServicoComDono.ts` (`encontrarDoDono` dá `404` antes de editar ou apagar, nos 4 CRUDs) | os testes de `404` em `testes/unidade/listas.test.ts`, `palavrasDasListas.test.ts`, `salas.test.ts` e `participantes.test.ts` |
| **Back-end · Cruds Completos** · ao menos 1 relacionamento entre os recursos | `mysql/06-listas.sql` (palavra → lista → usuário) e `mysql/07-salas.sql` (sala → usuário e lista; participante → sala e usuário); também `mysql/02-palavras.sql` e `mysql/05-resultados.sql` | `testes/integracao/listas.test.ts`, `testes/integracao/salas.test.ts`, `testes/integracao/resultados.test.ts` |
| **Tech Forge · Tipagem Avançada e Recursos do TypeScript** | Generics em `src/dominio/Pagina.ts` (`Pagina<T>`) e `src/repositorios/RepositorioDeRecursos.ts` (interface dos 4 CRUDs, com tipo padrão no terceiro parâmetro); tipos derivados de `as const` em `src/dominio/Sala.ts`; `Pick` e `Omit` em `src/dominio/Participante.ts`; `Exclude` e `Omit` em `src/dominio/EstadoDaPartida.ts`; uniões discriminadas em `src/dominio/Partida.ts` (`LetraRecusada`) e `src/esquemas/partida.ts` (`DadosEscolha`); nenhum `any` no projeto | `testes/unidade/paginacao.test.ts`, `testes/unidade/salas.test.ts`, `testes/unidade/partidaNaSala.test.ts` |
| **Tech Forge · Modelagem do Domínio e Pilares da POO** | `src/dominio/Partida.ts`, classe abstrata com a regra da forca, de que herdam `PartidaDiaria` (refaz a partida do dia a partir das letras chutadas) e `PartidaNaSala` (recebe uma letra por vez e dá os pontos); cada uma sobrescreve `recusar` (polimorfismo: a letra repetida ou depois do fim vira `400` no resultado do dia e `409` na sala). Herança com reuso de verdade também em `src/dominio/SenhaCriptografada.ts`, de que herdam `Senha` (a da conta) e `SenhaDaSala`; `src/repositorios/RepositorioMysql.ts` (busca, paginação e erros do banco, para os 4 repositórios dos CRUDs); `src/servicos/ServicoComDono.ts`, em que cada CRUD sobrescreve como achar o recurso, quem é o dono e que erro dar (polimorfismo: `403` nas listas e nas salas, `404` nas palavras e nos participantes) | `testes/unidade/partidaDiaria.test.ts`, `testes/unidade/regrasDaSala.test.ts`, `testes/unidade/senha.test.ts`, `testes/unidade/salas.test.ts`, `testes/unidade/participantes.test.ts` |
| **Probabilidade e Estatística · Análise Descritiva** · métricas adequadas | `src/dominio/EstatisticasDoDia.ts`: quantos jogaram, quantos não acertaram e a distribuição por número de letras, que vira o histograma do dia no front | `testes/unidade/estatisticas.test.ts` |

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
| `05-resultados.sql` | O resultado de cada pessoa em cada dia: as letras chutadas, os erros e se acertou. Um por pessoa por dia. |
| `06-listas.sql` | As listas de palavras de cada pessoa, usadas nas salas. O nome não se repete para a mesma pessoa, e cada palavra (com uma dica opcional) não se repete na mesma lista. Apagar a lista apaga as palavras dela. |
| `07-salas.sql` | As salas (pública ou com senha, tempo de 45, 90 ou 120 s, de 1 a 5 rodadas, de 2 a 10 jogadores) e quem está em cada uma. A mesma pessoa e o mesmo apelido não se repetem na sala, e um gatilho recusa quem chega com a sala cheia. Apagar a lista deixa a sala sem lista. |
| `08-vezes.sql` | As vezes de cada partida na sala (quem escolhe, a palavra, a dica e as horas de começo, escolha e fim) e as letras que cada jogador chutou em cada vez. O número da vez não se repete na sala, nem a letra para o mesmo jogador na mesma vez. Se quem escolhe sai da sala, a vez dele some. |

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
| `GET` | `/usuarios/:id` | Com login, só a própria conta. Devolve `id`, `nome`, `email` e `cpf`, para o formulário de edição. |
| `PUT` | `/usuarios/:id` | Com login, só a própria conta. Edita `nome`, `cpf` e `senha`, todos obrigatórios. Mandar `email` dá `400`, porque o e-mail não pode ser trocado. |
| `GET` | `/saude` | Diz se a API e o banco estão no ar. |
| `GET` | `/palavra-do-dia` | A palavra do dia, igual para todo mundo: `dia`, `palavra` e `categoria`. |
| `GET` | `/palavra-do-dia/estatisticas` | Como todo mundo foi no dia: quantos jogaram, quantos não acertaram e quantos acertaram com cada número de letras. Aceita `?dia=AAAA-MM-DD`. |
| `POST` | `/resultados` | Com login. Salva o resultado do dia: `dia` e `letras` (os chutes, na ordem). Devolve `201` com o resultado calculado. |
| `GET` | `/resultados` | Com login. O histórico de quem está logado, do mais novo para o mais antigo. Aceita `?dia=AAAA-MM-DD`. |
| `GET` | `/listas` | Com login. As listas de quem está logado, em ordem alfabética e em páginas, com quantas palavras cada uma tem. |
| `GET` | `/listas/:id` | Com login, só o dono. Uma lista. |
| `POST` | `/listas` | Com login. Cria uma lista: `nome`, de 2 a 40 caracteres, sem repetir entre as listas da pessoa. Devolve `201`. |
| `PUT` | `/listas/:id` | Com login, só o dono. Troca o `nome`. |
| `DELETE` | `/listas/:id` | Com login, só o dono. Apaga a lista e as palavras dela. Devolve `204`. |
| `GET` | `/listas/:listaId/palavras` | Com login, só o dono da lista. As palavras da lista, em ordem alfabética e em páginas. |
| `GET` | `/listas/:listaId/palavras/:id` | Com login, só o dono da lista. Uma palavra. |
| `POST` | `/listas/:listaId/palavras` | Com login, só o dono da lista. `palavra` (de 3 a 30 letras, com espaço ou hífen só entre as partes) e `dica` (opcional, de 2 a 80 caracteres). A palavra é guardada em maiúsculas e não se repete na lista. Devolve `201`. |
| `PUT` | `/listas/:listaId/palavras/:id` | Com login, só o dono da lista. Edita `palavra` e `dica`. Mandar a `dica` vazia ou `null` tira a dica. |
| `DELETE` | `/listas/:listaId/palavras/:id` | Com login, só o dono da lista. Devolve `204`. |
| `GET` | `/salas` | Com login. As salas públicas que ainda não acabaram, das mais novas para as mais velhas e em páginas. Com `?filtro=minhas`, as salas em que a pessoa está, inclusive as com senha. |
| `GET` | `/salas/:id` | Com login. Os dados de uma sala, para quem chega pelo link decidir se entra. A senha nunca aparece. |
| `POST` | `/salas` | Com login. Cria a sala: `nome`, `segundosPorRodada` (45, 90 ou 120), `rodadas` (de 1 a 5), `maximoDeJogadores` (de 2 a 10), `listaId` (opcional, uma lista da própria pessoa) e `senha` (opcional, de 4 a 30 caracteres). Quem cria já entra na sala. Devolve `201`. |
| `PUT` | `/salas/:id` | Com login, só quem criou e só antes da partida começar. Os mesmos campos da criação. Sem `senha`, a senha fica como está; com `null`, a sala fica pública. |
| `DELETE` | `/salas/:id` | Com login, só quem criou. Apaga a sala e tira todo mundo dela. Devolve `204`. |
| `GET` | `/salas/:salaId/participantes` | Com login, só quem está na sala. Os jogadores, na ordem em que chegaram, em páginas, com o dono marcado. |
| `GET` | `/salas/:salaId/participantes/:id` | Com login, só quem está na sala. Um jogador. |
| `POST` | `/salas/:salaId/participantes` | Com login. Entra na sala: `apelido` (de 2 a 20 caracteres, sem repetir na sala) e `senha`, se a sala tiver. Devolve `201`. |
| `PUT` | `/salas/:salaId/participantes/:id` | Com login, só o próprio jogador. Troca o `apelido`. |
| `DELETE` | `/salas/:salaId/participantes/:id` | Com login. O jogador sai, ou quem criou a sala tira alguém. Quem criou não sai: apaga a sala. Devolve `204`. |
| `GET` | `/salas/:salaId/partida` | Com login, só quem está na sala. Como está a partida para quem pergunta: a vez, a fase, os segundos que faltam, a própria forca, o andamento dos outros, o resultado da vez anterior e o placar. O front pergunta a cada segundo. |
| `POST` | `/salas/:salaId/partida` | Com login, só quem criou a sala, com pelo menos 2 jogadores. Começa a partida. Devolve `201`. |
| `POST` | `/salas/:salaId/partida/palavra` | Com login, só quem está na vez, enquanto escolhe. Com lista, `palavraId` (uma das 3 opções); sem lista, `palavra` e `dica` (opcional), com as regras das listas. |
| `POST` | `/salas/:salaId/partida/letras` | Com login, só quem está adivinhando. Chuta uma `letra` de A a Z. |

Pelo nginx, as rotas ganham `/api` na frente: `/api/login` chega na API como
`/login`. A API confia só no nginx para saber o IP de quem chamou, e é por esse
IP que ela conta as tentativas de cadastro e login.

As rotas com login pedem o token do `/login` no cabeçalho
`Authorization: Bearer <token>`. Sem token, com token inválido ou vencido, a
resposta é `401`.

Os erros voltam como `{ "mensagem": "...", "campos": { "campo": "..." } }`, em
português.

### Listas de palavras

Cada pessoa monta as próprias listas de palavras, que depois servem para as
salas. A palavra do dia continua vindo só das palavras oficiais.

As listagens aceitam `?pagina=` (a partir de 1) e `?porPagina=` (de 1 a 50). Sem
eles, a API devolve a primeira página com 10 itens. A resposta é sempre igual:

```json
{ "itens": [], "pagina": 1, "porPagina": 10, "total": 0, "totalDePaginas": 0 }
```

Mexer numa lista de outra pessoa dá `403`, e numa lista ou palavra que não existe
dá `404`. Uma palavra pedida pela lista errada também dá `404`: para aquela
lista, ela não existe.

### Salas

Só quem tem conta cria e entra em sala. Quem cria escolhe o tempo de cada rodada,
quantas rodadas, quantos jogadores cabem, uma das próprias listas de palavras e,
se quiser, uma senha. Sem senha, a sala aparece para todo mundo em `/salas`. Com
senha, ela não aparece: quem cria manda o link, e quem chega digita a senha.

A senha da sala é guardada com bcrypt, como a da conta (as duas herdam de
`src/dominio/SenhaCriptografada.ts`), e nunca sai da API. Errar a senha muitas
vezes bloqueia a entrada por 15 minutos, do mesmo jeito que o login.

A sala recusa com `409` quem já está nela, o apelido repetido, a sala cheia e a
sala encerrada. O próprio banco também recusa a sala cheia, com um gatilho em
`mysql/07-salas.sql`, para dois jogadores que cheguem ao mesmo tempo não passarem
do máximo.

### Partida na sala

Em cada rodada, cada jogador escolhe uma palavra uma vez, na ordem em que entrou
na sala, e os outros adivinham ao mesmo tempo, cada um com a própria forca. Com 4
jogadores e 2 rodadas, saem 8 palavras. Cada palavra é uma **vez**, que passa por
três fases:

1. **Escolhendo** (20 s): com lista, quem está na vez escolhe uma de 3 palavras
   sorteadas da lista entre as que ainda não saíram; sem lista, ou com a lista
   acabada, digita a palavra e uma dica. Se não escolher a tempo, a API sorteia:
   da lista ou, sem lista, das palavras oficiais, com a categoria como dica.
2. **Adivinhando** (o tempo da sala: 45, 90 ou 120 s): cada um chuta as letras na
   própria forca, com 6 erros. A vez acaba quando o tempo acaba ou quando todos
   terminam.
3. **Intervalo** (5 s): todos veem a palavra e os pontos antes da próxima vez.

Acertar vale 100 pontos, menos 10 por erro, e o primeiro a acertar ganha mais 20.
Quem escolheu ganha 10 por pessoa que acertou. Depois da última vez, a sala fica
`encerrada` com o placar final.

A palavra fica só na API: quem adivinha recebe as casas abertas da própria
forca e, dos outros, só os erros e quantas casas já abriram. A API confere cada
letra (`src/dominio/PartidaNaSala.ts`).

A partida não tem relógio no servidor. Cada pergunta à sala faz a partida andar
até o momento atual (`src/servicos/ServicoPartidaNaSala.ts`), e o banco aceita
cada mudança só uma vez, para dois jogadores que perguntem juntos não criarem a
mesma vez nem somarem os pontos duas vezes. Quem chega no meio entra no fim da
fila. Se quem está na vez sai, a vez passa para o próximo; se fica só uma pessoa
na sala, a partida acaba.

### Palavra do dia

O dia vale pelo horário de Brasília e troca à meia-noite. No primeiro pedido do
dia, a API sorteia uma palavra que nunca saiu; quando todas já saíram, volta a
que saiu há mais tempo. O sorteio fica guardado em `palavras_do_dia`, então quem
abrir o jogo no mesmo dia recebe a mesma palavra.

### Resultados do dia

O front manda só as letras chutadas. A API refaz a partida com a palavra daquele
dia (`src/dominio/PartidaDiaria.ts`) e calcula os erros, em quantas letras a
pessoa jogou e se acertou, então ninguém consegue inventar o resultado. Ela
recusa partida que não terminou, letra repetida e letra depois do fim. Dá para
salvar o resultado de hoje ou de ontem, para quem joga perto da meia-noite.

## Testes

```bash
npm test                 # unidade e ataques, sem banco
npm run test:integracao  # precisa do MySQL do docker compose no ar
```

Os dois rodam no GitHub Actions a cada publicação.
