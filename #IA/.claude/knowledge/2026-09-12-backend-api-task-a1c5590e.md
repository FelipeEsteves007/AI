---
agent: backend-api
slug: task-a1c5590e
data: 2026-09-12
origem: claude
---

# Aprendizados — backend-api · task-a1c5590e · 2026-09-12
## bugs
- No PUT, um aluno removido entre a leitura e a gravação dava 500 em vez de 404. Havia duas causas. O fake lançava um `Error` comum (`Aluno não encontrado`) em vez do `P2025` que o Prisma lança. E o service não traduzia `P2025`. A correção foi fazer o fake lançar `Prisma.PrismaClientKnownRequestError` com `code: 'P2025'` e fazer o `writeGuarded` do service converter esse erro em 404 `NOT_FOUND`, usando o helper `isRecordNotFound`.
- Um aluno podia ser atribuído a um usuário desativado. A causa era que `assertAssigneeExists` só conferia se o usuário existia, não se estava ativo. A correção foi `assertAssignable(assignedTo, current)`: o usuário precisa existir e estar ativo sempre que o `assignedTo` é definido ou alterado. Se o responsável continua o mesmo, a gravação é aceita mesmo que ele esteja inativo.

## arquitetura
- O escopo de RBAC vai no `where` do próprio `update` (`{ id, assignedTo }`), não num `findById` separado. Assim a conferência e a gravação acontecem num passo só. Um aluno reatribuído ou removido no meio vira `P2025`, e nunca há escrita fora do escopo. A checagem só com `findById` antes da gravação deixava uma janela de corrida e foi descartada.
- A interface do repositório passou a ser `update(id, data, scope: StudentScope)`, com o escopo obrigatório, para que nenhum chamador consiga gravar sem escopo.
- `P2025` vira 404 por meio do helper `isRecordNotFound` em `api/utils/prismaErrors.ts`, ao lado de `uniqueViolationTarget`. Os erros do Prisma são traduzidos no service, não no model.
- O DELETE não lê o aluno antes: um id inexistente gera `P2025` e vira 404. Isso evita uma consulta extra e a corrida entre a leitura e a exclusão.
- Compras, leads e tarefas são apagados pelo `onDelete: Cascade` do banco, não à mão no service. Apagar à mão seria redundante e esconderia um schema errado.
- Na rota, a autorização (`requirePermission`) vem antes da validação do `:id`. Quem não tem permissão recebe 403 mesmo com id inválido ou inexistente, e não descobre se o id existe.
- O service confere a permissão (`students:delete`) de novo, além do middleware, como defesa em profundidade.
- A regra de responsável ativo só vale quando o `assignedTo` é definido ou alterado. Um PUT que mantém um responsável que ficou inativo continua permitido, para não travar a edição de outros campos.
- O enum `AuditAction` não tem ação para exclusão de aluno. O schema não foi alterado fora do escopo da task: a falta foi repassada ao orquestrador como pendência. Hoje o DELETE não grava auditoria.

## padrao
- O fake em memória reproduz o comportamento do Prisma: lança os mesmos erros tipados (`P2025`, `P2002`), aplica o escopo no `update` e simula o `onDelete: Cascade` no `delete`. Assim os testes provam o contrato do repositório.
- O fake expõe um `snapshot()` para os testes conferirem as tabelas depois de operações em cascata.
- A ordem da rota protegida é `requireAuth()` (no `router.use`), depois `requirePermission(...)`, depois `validate(schema, 'params')` e por fim o controller.
- DELETE bem-sucedido responde `res.status(204).end()`, sem corpo.
- As mensagens em `details.assignedTo` são distintas: `'Responsável não encontrado'` para usuário inexistente e `'Responsável desativado'` para usuário inativo.
- O TDD registra a falha real antes de implementar. Testes que já nascem verdes são declarados como regressão, não como ciclo vermelho → verde.
- Divisão entre agents paralelos: o backend mexe só em `api/` e `tests/api/`, o frontend em `src/`. `prisma/` e a documentação de sprint ficam com o orquestrador.
- O retorno do agent separa as partes, lista arquivos e testes, cola a saída real de `npm run typecheck` e `npx jest --selectProjects api --silent`, e informa pendências e desvios de contrato, inclusive mudanças de interface interna.
- O que não foi verificado (cascata no banco real, `where` com escopo contra o Prisma real) é relatado como pendência, não dado como pronto.

## falha
- Um heredoc no Bash com arquivo de teste longo cheio de aspas simples falhou com `unexpected EOF while looking for matching`. O que funcionou foi escrever o conteúdo com a ferramenta Write num arquivo do scratchpad e depois anexá-lo.
- Um script `node -e` que substitui trechos multi-linha (`"  update: RequestHandler;\n}"`) não achou o texto no arquivo. A ferramenta Edit resolveu a mesma troca.
- Espalhar um helper no `where` do update (`{ id, ...toWhere(scope) }`) não passou no typecheck. Funcionou montar o objeto explicitamente tipado como `Prisma.StudentWhereUniqueInput` (`scope.assignedTo === undefined ? { id } : { id, assignedTo }`).
- Supor que os testes de string vazia → `null`, mass assignment e senha provisória em POST/PUT/DELETE falhariam estava errado. A rota já normalizava strings vazias. O Zod descarta chaves desconhecidas. E o `router.use(requireAuth())` já cobre todos os métodos. Esses testes nasceram verdes.
- `npm run db:generate` dá EPERM enquanto o `npm run dev:api` do desenvolvedor está rodando, e esse processo não pode ser encerrado. Por isso o Prisma Client de runtime não conhece os models novos, e a cascata e o `where` com escopo não puderam ser verificados no banco real.
- `npx prettier` e outros formatadores não devem ser usados: o projeto não usa formatador, e rodá-lo já causou retrabalho na sprint.
- O teste do model com mock do client só confere os argumentos passados ao Prisma, como `delete({ where: { id } })`. Ele não prova a cascata nem o `P2025` de escopo, que precisam de teste de integração.
