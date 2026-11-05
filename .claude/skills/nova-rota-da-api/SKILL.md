---
name: nova-rota-da-api
description: Cria uma rota nova na API do Hangdle seguindo as camadas do projeto (esquema zod, serviço, repositório, rota, testes e README). Use ao acrescentar ou mudar um endpoint.
---

# Nova rota da API

Siga as camadas na ordem, cada uma com uma responsabilidade só:

1. **Esquema** em `src/esquemas/`: valide o corpo, a query e os parâmetros com
   zod. As mensagens são em português e dizem o que fazer ("Informe o nome.").
2. **Domínio** em `src/dominio/`, se houver regra: uma classe com campos `#`
   privados que não deixa nascer um objeto inválido.
3. **Repositório:**
   - a interface em `src/repositorios/RepositorioX.ts`;
   - a implementação no MySQL em `RepositorioXMysql.ts`, com SQL parametrizado (`?`), nunca concatenando o que vem do usuário;
   - a versão em memória em `testes/apoio/`, para os testes de unidade.
4. **Serviço** em `src/servicos/`: junta o domínio e o repositório. Para os
   problemas, use os erros de `src/erros/ErroAplicacao.ts`:
   - 400 `ErroValidacao`
   - 401 `ErroCredenciais`
   - 403 `ErroProibido`
   - 404 `ErroNaoEncontrado`
   - 409 `ErroConflito`
5. **Rota** em `src/rotas/`, fina: valida, chama o serviço e responde. Rotas que
   pedem login recebem o middleware `exigirLogin` e leem o usuário com
   `usuarioLogado(resposta)`. Quem edita ou apaga um recurso precisa ser o dono:
   confira no serviço.
6. **Ligue a rota** em `src/app.ts` e as dependências em `src/server.ts` e em
   `testes/apoio/criarAppTeste.ts`.
7. **Testes** em `testes/unidade/`, com `supertest` e `criarAppTeste()`:
   - o caminho feliz;
   - sem login (401);
   - recurso de outra pessoa (403);
   - recurso que não existe (404);
   - dados inválidos (400).
8. **README:** acrescente a linha na tabela "Rotas" e, se a rota atende algum
   item da rubrica, a marcação `// Rubrica de ...` e a linha no mapa da rubrica.
9. Rode `npm run typecheck`, `npm test` e `npm run test:integracao`, depois faça o
   commit `feat(api): ...`.
