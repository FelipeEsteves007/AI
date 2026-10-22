---
agent: backend-api
slug: task-a7c32927
data: 2026-09-14
origem: claude
---

# Aprendizados — backend-api · task-a7c32927 · 2026-09-14
## bugs
- Busca de alunos com `%` ou `_` no termo trazia resultados demais → os curingas não eram escapados antes de irem para o `ILIKE` → `escapeLikePattern` aplicado no `toWhere` do `studentModel` a nome e e-mail, com testes unitários e de integração para `%`, `_` e `\`.
- Excluir um aluno podia apagar ele e a cascata (compras, oportunidades, tarefas) sem deixar registro → `auditLogs.record` rodava no service depois do commit da transação do delete → a gravação do log passou para dentro da mesma `$transaction`, com `tx.auditLog.create`, e agora uma falha no log desfaz a exclusão.
- `DELETE /api/students/:id` não gravava auditoria, contrariando a constitution → não havia o valor `STUDENT_DELETED` no enum `AuditAction` nem gravação no fluxo de delete → valor adicionado ao enum por migration, com a gravação do log dentro da transação do delete.
- Teste de integração quebrado por bytes NUL literais no arquivo `.ts` → o script de edição em Python gravou `\u0000` como byte `0x00` em vez da sequência de escape do TS → os bytes foram trocados pela sequência de texto `\u0000` direto no binário.

## arquitetura
- Uma auditoria que precisa ser atômica com a operação fica no repositório do agregado, dentro da `$transaction`, e não no service. O model recebe um builder de auditoria (`studentModel.delete(id, audit)`, tipo `StudentDeletionAuditBuilder`) e dentro da transação faz, em ordem: lê o snapshot, apaga e cria o log com `tx.auditLog.create`. O service continua decidindo o conteúdo do log (ação, ator, metadata). Alternativa descartada: service injeta `auditLogs` e grava depois do commit, porque não há transação entre repositórios e uma falha deixa a exclusão sem registro, sem volta.
- O `studentService` não recebe mais `auditLogs`: quem grava é o repositório de alunos, e a dependência ficaria sem uso.
- O mapeamento de auditoria para o Prisma fica em `toAuditLogCreateData` (`auditLogModel.ts`), usado tanto pelo `record` quanto pelas gravações em transação de outros models. Assim os dois formatos não divergem.
- `StudentRepository.delete` devolve um `StudentDeletionSnapshot` (`id`, `name`, `email`, `cascade: { purchases, pipelineLeads, tasks }`) lido na mesma transação do delete, para o snapshot bater com o que foi apagado de fato.
- O delete de aluno lê antes com `findById` no escopo do usuário: se não achar, devolve 404 sem apagar e sem auditar. Se o registro sumir entre a leitura e o delete (P2025), também dá 404 sem log.
- Dados do aluno ficam só no `metadata` do AuditLog. As colunas `email` e `targetUserId` ficam vazias porque `email` alimenta o bloqueio de login (RN-07) e `targetUserId` aponta para usuário: preencher com dados de aluno misturaria as duas entidades.
- Risco aceito: no isolamento padrão do Postgres (read committed), um filho criado entre a contagem e o delete é apagado sem entrar na contagem do snapshot.
- Busca de alunos cobre só nome e e-mail, conforme `contracts/api.md` e `sprint-6-alunos.md`. CPF e telefone não entram.

## padrao
- Fake em memória de repositório com auditoria transacional: recebe o `InMemoryAuditLogRepository` no construtor (nas rotas, o mesmo objeto de `Repositories.auditLogs`) e grava o log antes de alterar o estado. Se a gravação falhar, nada muda, o que imita o rollback.
- Toda operação transacional com auditoria tem teste de "auditoria falha → operação desfeita" em três camadas: service com fake, rota (espera 500 e o dado continua lá) e integração no Postgres real.
- Para provar rollback na integração sem FK disponível, forçar um erro do próprio banco, como `metadata` com `\u0000` que o `jsonb` recusa (22P05), e conferir a mensagem com `rejects.toThrow(/unsupported Unicode escape sequence|22P05/)`, não com `toBeInstanceOf(Error)`, para garantir que o erro veio do banco.
- Testes de integração apagam no `afterAll` os logs de auditoria que criaram, filtrando pelo ator do teste, para não sujar o banco `crm_alunos_test`.
- Mudança de enum no Prisma: rodar `prisma migrate status` antes, `npm run db:migrate -- --name <nome> --create-only` para revisar o SQL, depois `npm run db:migrate` e `npm run db:generate`. Nunca `migrate reset` (volume compartilhado).
- Números de verificação vêm da saída redirecionada para arquivo, com `grep -E "^Tests:|^Test Suites:|●.*›"` e `grep -c "error TS"`, e não do exit code de pipe.
- Suítes: `npm test` (unitários com fakes), `npm run test:integration` (`jest.integration.config.js`, `tests/integration/**`, banco `crm_alunos_test` via `.env.test`), `npm run test:coverage` (mínimo de 70%).
- Na fase vermelha do TDD, testes do tipo "não grava quando 403/404/erro" já passam antes da implementação e ficam como proteção contra regressão.
- Fake de busca usa `includes`, que já trata `%`, `_` e `\` como literais e segue coerente com o `ILIKE` escapado.

## falha
- Gravar auditoria no service depois do delete, seguindo o padrão do `userService`, foi reprovado no code review: não é atômico e uma falha no log deixa a exclusão irreversível sem registro. Copiar o padrão existente não basta quando a operação é destrutiva.
- Usar `actorId` inexistente para forçar erro de FK e provar rollback não funciona: `AuditLog.actorId` não tem FK, e o banco aceita a gravação.
- Editar arquivos `.ts` com heredoc Python escrevendo `\u0000` gera byte NUL real no arquivo, e não a sequência de escape. É preciso escapar a barra ou gravar em binário com `bytes([92])+b'u0000'`.
- `expect(repository.auditLogs.entries)` não compila quando a propriedade é tipada pela interface do repositório. É preciso fazer cast para `InMemoryAuditLogRepository` depois de `toBeInstanceOf`.
- Suposição descartada: o `standard_conforming_strings` afetaria o escape do `ILIKE`. Ele só vale para literais no SQL, e o Prisma 6 manda o termo como parâmetro sem cláusula `ESCAPE`, então vale o `\` padrão do Postgres e o Prisma não escapa por conta própria (sem escape duplo, confirmado nos testes de integração).
- Pendência de cobertura: `auditLogModel.ts` está em 61,53%. As consultas do bloqueio de login já estavam sem teste antes desta sessão.
