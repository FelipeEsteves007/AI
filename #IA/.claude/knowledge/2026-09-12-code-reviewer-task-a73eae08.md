---
agent: code-reviewer
slug: task-a73eae08
data: 2026-09-12
origem: claude
---

# Aprendizados — code-reviewer · task-a73eae08 · 2026-09-12
## bugs
- (nada nesta sessão)

## arquitetura
- Para restringir o `update` do aluno por escopo, o filtro vai direto no `where` (`where: { id, assignedTo }`), sem leitura prévia. No Prisma 5/6 isso é um `WhereUniqueInput` válido e, fora do escopo, lança `P2025`, que vira 404. Assim a checagem de posse e a escrita acontecem numa operação só.
- `assignedTo` só entra no `where` quando é `!== undefined`. `scopedAssignedTo` devolve `undefined` para quem tem `data:view-all` (admin/CEO), então não vira filtro por engano.
- `deleteStudent` não lê o registro antes. Isso não vaza informação porque o `requirePermission('students:delete')` roda na rota antes da validação: quem não é admin recebe 403 para uuid válido, inválido ou inexistente. Só o admin distingue 404 de 400.
- Na S6-10, a validação de responsável desativado só vale para atribuição nova (`if (!assignedTo || assignedTo === current)` pula). Manter um responsável já inativo, enviar `null` ou omitir `assignedTo` no PUT é permitido.
- A exclusão do aluno depende do `ON DELETE CASCADE` do banco (compras, leads, tarefas). O service não apaga os filhos, e há teste confirmando isso de propósito.
- Auditoria de exclusão de aluno ficou pendente porque o `AuditAction` não tem ação para isso e a mudança exige migration. Correção prevista: `STUDENT_DELETED` no enum e `auditLogs` injetado no `createStudentService`, como no `userService.audit`. Os dados do aluno (id, nome, e-mail, contagem de filhos) vão em `metadata`, porque o `AuditLog` não tem FK para o aluno e a linha deixa de existir. Por isso a auditoria exige um `findById` sem escopo antes do delete.
- Os services de escrita destrutiva conferem de novo a permissão (`students:delete`) além do `requirePermission` da rota. É mais rígido que o `userService` da 002, que confia só na rota. Registrar como padrão para a importação (TASK-012).

## padrao
- Erros do Prisma são traduzidos por helpers em `api/utils/prismaErrors.ts` (ex.: `isRecordNotFound` → `P2025`), que usam `instanceof PrismaClientKnownRequestError`.
- Na rota, `requirePermission(...)` vem antes do middleware de validação, para a autorização sair antes do 400.
- DELETE bem-sucedido responde 204. Repetir o DELETE responde 404.
- O fake `tests/api/fakes/inMemoryRepositories.ts` deve imitar a Prisma de verdade: lançar um `PrismaClientKnownRequestError` real com `P2025` (para o `instanceof` funcionar), aplicar o escopo no update, reproduzir exatamente as relações com `onDelete: Cascade` do schema e expor `snapshot()` para os testes conferirem o estado.
- Quando a interface interna muda para um parâmetro obrigatório (ex.: `update(id, data, scope)`), o `tsc` aponta chamadores esquecidos. Rodar `npm run typecheck` antes de revisar.
- Verificação da trilha de backend: `npm run typecheck` e `npx jest --selectProjects api --silent`.
- Formato do review: abrir com `🤖 agent: code-reviewer`, dar o veredito, classificar achados em 🔴/🟡/🟢 com arquivo:linha, cenário, referência e correção, e fechar com `↩️ devolvendo ao orquestrador`.
- Pendências conhecidas (ex.: falta de auditoria) precisam ser registradas na nota da sprint. Não podem ficar só no relato do implementador.

## falha
- Não rodar `npm run build` com o `next dev` no ar: o build quebra o servidor de desenvolvimento.
- `db:generate` (Prisma) falha com EPERM enquanto o `dev:api` está no ar, porque o client gerado fica bloqueado. Migrations e mudanças de enum precisam parar a API antes.
- Testar a cascata só no fake não prova o comportamento no banco: o teste de rota montava os filhos mas não conferia que foram apagados. A garantia real vinha só da migration e de verificação manual, então falta um teste de integração contra `crm_alunos_test`.
- A entrega da exclusão (TASK-009) passou nos 398 testes e mesmo assim descumpria a constitution ("Auditoria de ações críticas: delete"), porque a lista "Testável" da task não pedia auditoria. Checklist de task não substitui conferir a constitution.
