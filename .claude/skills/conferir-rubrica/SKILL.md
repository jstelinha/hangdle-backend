---
name: conferir-rubrica
description: Confere se cada item da rubrica da Tech Academy tem código, marcação "Rubrica de", teste e linha no mapa do README. Use antes de uma entrega ou quando pedirem para revisar a rubrica.
---

# Conferir a rubrica

1. **Liste as marcações:** `git grep -n "Rubrica de"`. O formato é sempre
   `// Rubrica de <Disciplina> - <Critério> - <Requisito>` (`--` nos arquivos SQL).
2. **Compare com o mapa** "Onde está cada item da rubrica" do `README.md`. Para
   cada linha, confira três coisas:
   - o arquivo citado existe e tem a marcação;
   - o teste citado existe e passa;
   - o que a rubrica pede está mesmo no código, e não só no comentário.
3. **Procure o que falta.** Os itens de back-end da rubrica são:
   - Autenticação;
   - Cadastro de Usuário;
   - Edição de Usuário;
   - CRUDs Completos: 4 CRUDs com rotas autenticadas, paginação, recusa para recurso que não existe e ao menos 1 relacionamento;
   - Configuração de Agentes.
   O Tech Forge também conta, e pede encapsulamento, getters, modelagem, tipos, SOLID e exceções.
4. **Responda com uma tabela** de três colunas: item, situação (completo,
   parcial ou faltando) e o que falta. Não mude código nesta skill: só aponte.
