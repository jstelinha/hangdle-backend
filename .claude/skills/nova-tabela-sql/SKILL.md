---
name: nova-tabela-sql
description: Cria ou muda tabelas do MySQL do Hangdle com um arquivo SQL numerado novo, travas no banco e testes de integração. Use sempre que a tarefa mexer na estrutura do banco.
---

# Nova tabela SQL

1. **Arquivo novo, nunca editar um antigo.** Crie `mysql/NN-assunto.sql` com o
   próximo número. Os arquivos antigos já rodaram em bancos que existem.
2. **Comece com `SET NAMES utf8mb4;`**, senão o MySQL grava os acentos trocados.
3. **Travas no próprio banco:**
   - `PRIMARY KEY`, `FOREIGN KEY` e `UNIQUE` com nome (`fk_tabela_coluna`, `uq_tabela_coluna`);
   - `CHECK` para formato e limites;
   - `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`.
4. **Teste num banco descartável**, com a pasta `mysql/` montada, para ver se
   todos os arquivos rodam do zero, em ordem.
5. **Aplique no banco do Docker** que já existe, como manda o README:
   `docker exec -i hangdle_mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < mysql/NN-assunto.sql`.
   Não leia nem imprima a senha: ela fica só dentro do container.
6. **Testes de integração** em `testes/integracao/`, cada teste dentro de uma
   transação desfeita no fim. Se a tabela nova tiver chave estrangeira, coloque-a
   em `TABELAS_DO_JOGO`, em `testes/apoio/conexaoTeste.ts`, antes das tabelas de
   que ela depende.
7. **README:** acrescente a linha do arquivo na tabela "Banco de dados".
8. Rode `npm run typecheck`, `npm test` e `npm run test:integracao` antes do commit
   `feat(banco): ...`.
