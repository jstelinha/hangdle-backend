# AGENTS.md — Hangdle (back-end)

Guia para qualquer agente de IA que trabalhe neste repositório. Vale para o
Claude Code, o Codex e outros que leem `AGENTS.md`.

## O projeto

API do Hangdle, a forca diária: uma palavra por dia, a mesma para todo mundo.
Node 24 + TypeScript + Express 5 + MySQL 8.4, com zod para validar a entrada e
JWT para o login. O front fica no repositório `hangdle-frontend`, numa pasta ao
lado desta.

## Comandos

```bash
npm run typecheck        # tipos
npm test                 # testes de unidade e de ataques, sem banco
npm run test:integracao  # testes com o MySQL do docker compose no ar
npm run build            # compila para dist/
docker compose up -d --build && docker compose restart nginx
```

Rode `typecheck`, `test` e `test:integracao` antes de qualquer commit.

## Onde fica cada coisa

| Pasta | O que tem |
|---|---|
| `src/dominio/` | Entidades e regras (`Usuario`, `Cpf`, `Senha`, `PartidaDiaria`...), com campos privados `#` |
| `src/servicos/` | Casos de uso, que juntam domínio e repositórios |
| `src/repositorios/` | Interfaces e implementações no MySQL |
| `src/esquemas/` | Validação da entrada com zod |
| `src/rotas/` | Rotas do Express, finas: validam, chamam o serviço e respondem |
| `src/middlewares/` | Login (`exigirLogin`), limite de tentativas e tratamento de erros |
| `src/erros/` | Erros próprios (`ErroValidacao`, `ErroProibido`...) |
| `mysql/` | SQL em arquivos numerados, rodados em ordem na primeira subida |
| `testes/` | `unidade/` (sem banco), `integracao/` (MySQL) e `apoio/` (repositórios em memória) |

## Convenções

- Código, nomes e mensagens em português, sem abreviar.
- Erros para o usuário em português, no formato `{ mensagem, campos }`.
- Todo trecho que atende um item da rubrica leva o comentário
  `// Rubrica de <Disciplina> - <Critério> - <Requisito>` e entra na tabela do
  `README.md`. Fora isso, comentários só quando o porquê não é óbvio.
- Commits curtos no padrão `tipo(escopo): descrição` (`feat`, `fix`, `refactor`,
  `docs`, `test`, `chore`), uma branch por assunto, criada a partir da `dev`.

## Guardrails

O que o agente **não pode** fazer, travado também em `.claude/settings.json`:

1. **Ler, editar ou mostrar o `.env`.** Ele tem as senhas do banco e o segredo do
   JWT. Para saber quais variáveis existem, use o `.env.example`. Nunca escreva
   valores de senha ou token em código, testes, logs, commits ou respostas.
2. **Apagar dados:** nada de `docker compose down -v`, `DROP`, `TRUNCATE` ou
   `DELETE` sem `WHERE` fora de transação de teste.
3. **Reescrever o histórico:** nada de `git push --force` ou `git reset --hard`.
   Todo `git push` pede confirmação.
4. **Mudar um arquivo SQL que já foi aplicado.** Mudança no banco é sempre um
   arquivo novo em `mysql/`, com o próximo número.
5. **Commitar sem testar** ou direto na `main`.

Na dúvida sobre algo destrutivo ou que sai do computador, pare e pergunte.

## Skills

Receitas para as tarefas que mais se repetem aqui, em `.claude/skills/`:

| Skill | Quando usar |
|---|---|
| `nova-tabela-sql` | Criar ou mudar tabelas do banco |
| `nova-rota-da-api` | Criar uma rota nova, do esquema zod ao teste |
| `conferir-rubrica` | Conferir se cada item da rubrica tem código, marcação, teste e linha no README |
