#!/bin/sh
# O usuário da API (MYSQL_USER, que vem do DB_USER do .env) nasce com ALL PRIVILEGES no banco: poderia apagar
# tabelas e as travas (gatilhos) dos arquivos anteriores. A API só lê e grava linhas, então fica só com SELECT,
# INSERT, UPDATE e DELETE. Os testes de integração também só precisam disso.
#
# É .sh, e não .sql, porque o nome do usuário vem do .env: só o shell lê as variáveis do container.
# Roda na primeira subida, depois dos .sql, como os outros arquivos desta pasta. A senha fica só dentro do container.
set -e

MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot <<SQL
REVOKE ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* FROM '$MYSQL_USER'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'%';
SQL
