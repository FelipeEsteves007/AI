---
agent: qa-testes
slug: task-aa958fe0
data: 2026-09-14
origem: claude
---

# Aprendizados — qa-testes · task-aa958fe0 · 2026-09-14
## bugs
- A busca com `%` ou `_` trazia resultados demais (`"100%"` casava `Desconto 1000`, `"%"` sozinho casava todos os alunos do escopo, `"ana_maria"` casava `anaXmaria`). Causa: o `contains` com `mode: 'insensitive'` do Prisma não escapa curingas e manda o termo como veio para `ILIKE '%termo%'`, e nenhuma camada (services, routes, controllers, utils) fazia esse escape. Correção: a função `escapeLikePattern` no `studentModel.ts` põe `\` antes de `\`, `%` e `_`, e o `toWhere` passa a usar o termo escapado em `name` e `email`. Há teste unitário do escape e teste de integração para `%`, `_` e `\` literais.

## arquitetura
- Os testes de integração ficam fora do `npm test` e da cobertura, com config própria (`jest.integration.config.js`) e script `test:integration` (`dotenv -e .env.test -- jest -c jest.integration.config.js --runInBand`). Motivo: o `npm test` e a cobertura precisam rodar sem banco.
- A pasta escolhida foi `tests/integration/`, que espelha o caminho do código (`tests/integration/api/models/`), como as pastas irmãs `tests/api`, `tests/src` e `tests/e2e`. O `jest.config.js` padrão só procura em `tests/api` e `tests/src`, então não pega essa pasta. A config de integração só aceita arquivos `*.integration.test.ts`.
- O banco de teste é conferido duas vezes, no `globalSetup` e no próprio arquivo de teste, antes de abrir conexão: a URL tem que terminar em `_test`, a mesma regra do globalSetup do E2E. A regra fica numa função pura (`assertTestDatabase`) com teste próprio.
- O `globalSetup` aplica só `prisma migrate deploy` (idempotente), nunca `migrate reset`.
- Para isolar os dados, cada execução marca com uma etiqueta única os usuários, alunos e cursos que cria, e as buscas ficam no escopo dos vendedores criados. O `afterAll` apaga só o que foi criado. `TRUNCATE` foi descartado para não quebrar os usuários de que o E2E depende no mesmo banco `_test`.
- A execução é serial (`--runInBand` e `maxWorkers: 1`) para os testes não colidirem no banco.
- O teste de integração cobre só o model. O mapeamento de `P2025` para 404 no serviço fica para outra camada.

## padrao
- O fake em memória só prova o fake. O que depende do banco (ILIKE com acento, collation, curingas, `P2025`/`P2002`, cascata do DELETE) é testado em integração contra o Postgres real.
- Se um teste de integração achar bug no model, a correção vai no model junto com teste unitário (no teste do model com fake client, conferir o `where` enviado ao Prisma) e um caso de integração.
- Depois da suíte de integração, conferir que não sobraram linhas (alunos, usuários e cursos com a etiqueta ou o domínio de e-mail do teste).
- Para confirmar a ordenação, o resultado do `list` é comparado com um `ORDER BY name, id` feito direto no banco, e não com uma ordem calculada em JS.
- O `.env.test` não é impresso. Para inspecionar, extrair só o nome do banco e o host.
- Validação final a reportar: `npm run test:integration`, `npm test`, `npm run typecheck` e `npm run test:coverage`, com números lidos da saída.
- Comportamentos confirmados no banco: `update` e `delete` fora do escopo ou com id inexistente dão `P2025`; e-mail com outra caixa ou CPF repetido dá `P2002`; o e-mail é gravado em minúsculas; `findById` e `findDetail` fora do escopo devolvem `null`; o `delete` devolve `{ id, name, email, cascade: { purchases, pipelineLeads, tasks } }` e preserva aluno vizinho, curso e vendedores.

## falha
- Estava errada a suposição, registrada no handoff como "conferida à mão", de que `%` e `_` na busca já eram literais. O banco real mostrou o contrário.
- Estava errada a suposição de que a busca ignora acento. O `ILIKE` em `en_US.utf8` ignora só maiúsculas: `"JOÃO"` casa `joão`, mas `"joao"` não casa `joão`, porque não há `unaccent`.
- Não se pode confiar que o `contains` do Prisma trata o termo como texto literal, porque ele não escapa curingas do LIKE.
- Um script `node` no scratchpad, fora do projeto, falha com `Cannot find module '@prisma/client'`. Funcionou rodar com `NODE_PATH="<projeto>/node_modules"` e `npx dotenv -e .env.test -- node <script>`.
- Chamar o Prisma CLI por shell é frágil num caminho com espaço e `#` (`D:\1. Exemplos Cursos\#ImersaoIA`). O `globalSetup` usa `execFileSync` com `node` apontando para `node_modules/prisma/build/index.js`, sem shell.
