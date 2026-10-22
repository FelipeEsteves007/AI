---
agent: code-reviewer
slug: task-a1e45b36
data: 2026-09-14
origem: claude
---

# Aprendizados — code-reviewer · task-a1e45b36 · 2026-09-14
## bugs
- (nada nesta sessão)

## arquitetura
- Auditoria `STUDENT_DELETED` gravada depois da transação do delete, fora dela, seguindo o padrão do `userService`. Isso é tolerável quando a ação pode ser desfeita (trocar papel, desativar usuário). Num delete com cascata não é: se o `auditLogs.record` falhar, o aluno e os filhos já foram apagados sem registro de quem apagou, o cliente recebe 500 e, se tentar de novo, recebe 404. Correção recomendada: gravar com `tx.auditLog.create` dentro da mesma `$transaction` do `studentModel.delete`, com o model recebendo `actorId` ou o repositório aceitando um callback de auditoria. Alternativa mínima, se a gravação ficar fora da transação: `logger.error` com o snapshot e um teste que documente o comportamento.
- No AuditLog de exclusão de aluno, as colunas `email` e `targetUserId` ficam vazias e o snapshot vai só em `metadata` { student:{id,name,email}, cascade:{purchases,pipelineLeads,tasks} }. Motivo: essas colunas servem ao bloqueio de login da RN-07 (`countFailedLoginsSince` filtra por `email`). Gravar ali o e-mail de um aluno misturaria alunos com usuários.
- As contagens da cascata usam READ COMMITTED, sem subir o isolamento. Um filho inserido entre o `findUniqueOrThrow` e o `delete` é apagado pela cascata, só não entra na contagem. A diferença afeta apenas o número do relatório.
- Um 404 no delete não grava auditoria, porque nada foi apagado.
- Sem coluna própria para o alvo, responder "quem apagou o aluno X" exige filtrar `metadata->'student'->>'id'`, que não tem índice. Com o volume atual basta. Se a tela de auditoria sair, considerar colunas genéricas `targetId`/`targetType`.
- Nome e e-mail do aluno excluído ficam guardados em `metadata` sem prazo. A decisão de retenção (LGPD) deve ser registrada no plan ou na constitution.
- O serviço lê o aluno com `findById` antes da transação, para resolver o escopo e o 404, e o model lê de novo com `findUniqueOrThrow` dentro dela. A leitura dupla é aceita.

## padrao
- RBAC é checado duas vezes no backend: `requirePermission('<recurso>:<ação>')` na rota e `hasPermission` de novo no serviço.
- Auditoria de ação crítica cobre "quem, quando, o quê": o ator em `actorId`, a data no `createdAt` do banco e o conteúdo afetado em `metadata`.
- Nova ação de auditoria entra por migration que só adiciona o valor ao enum (`ALTER TYPE "AuditAction" ADD VALUE '...'`), sem usar o valor na mesma migration, por causa da limitação do Postgres.
- Os testes de uma ação auditada cobrem o caminho feliz no serviço, na rota e no model, e cobrem os erros 404, 403, P2025 e falha genérica, confirmando que nenhum deles grava auditoria. Também deve haver teste para falha do próprio `record`.
- Mudanças em repositório vêm acompanhadas de ajuste no fake `tests/api/fakes/inMemoryRepositories.ts` e no teste desse fake.
- Ao concluir um item bloqueado na sprint (ex.: `sprints/sprint-6-alunos.md`), atualizar a nota de pendência, para não travar a liberação por engano.
- A verificação de uma revisão usa `npm run typecheck` (`tsc --noEmit`) e `npm test` (jest). `npm run build` e servidores não rodam na revisão.
- O review devolve achados em BLOQUEANTE, IMPORTANTE e SUGESTÃO, com arquivo:linha, e um veredito (ex.: APROVADO COM RESSALVAS).

## falha
- Suposição errada: "seguir o padrão já aprovado do `userService`" basta para gravar a auditoria fora da transação. O padrão só vale para ações reversíveis. Num delete irreversível com cascata, uma falha no `record` apaga os dados sem deixar rastro.
- Suposição errada: as colunas `email`/`targetUserId` do AuditLog são genéricas para qualquer alvo. Elas alimentam a regra de bloqueio de login (RN-07) e não podem receber dados de aluno.
- `git diff prisma/schema.prisma` não isola a mudança revisada: o diff traz também os models de negócio da migration anterior (`business_models`), ainda sem commit. É preciso filtrar à mão a linha que interessa.
