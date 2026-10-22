---
agent: frontend-ui
slug: task-a7f39e2e
data: 2026-09-12
origem: claude
---

# Aprendizados — frontend-ui · task-a7f39e2e · 2026-09-12
## bugs
- Digitar `maria `, esperar o debounce de 300 ms e continuar fazia o campo virar `marias` → o debounce emitia `next.trim()`, o pai devolvia o termo aparado e o `useEffect([value])` sobrescrevia o campo → guardar numa ref o último termo emitido e ignorar quando `value` volta igual a ele; mudanças vindas de fora (ex.: limpar filtros) continuam sincronizando.
- A listagem de alunos travava com valores inválidos na URL (`?assignedTo=abc`, `search` longo) → `stateFromQuery` repassava ao backend valores que ele recusa com 400, e a mesma query se repetia → descartar `assignedTo` que não é UUID, cortar `search` em 255 caracteres e, com 400 `VALIDATION_ERROR`, voltar os filtros ao padrão (se já estiverem no padrão, só mostrar o erro, sem repetir a busca).
- O foco caía no `body` durante a exclusão no dialog → os botões ficavam `disabled` enquanto um deles tinha o foco → usar `aria-disabled` e ignorar cliques em vez de `disabled`.
- Esc não fechava o dialog com o foco fora dele → o listener de teclado estava no próprio elemento → listener em `document` enquanto o dialog está montado.
- Uma resposta sem corpo passava despercebida no service de alunos → casts `as StudentListResponse` etc. escondiam o `null` que o `apiClient` pode devolver → helper `requireBody`, que lança `ApiError(0, 'EMPTY_RESPONSE')`.

## arquitetura
- Criado o hook genérico `src/hooks/useDialogFocus.ts`: foco inicial, Tab e Shift+Tab presos, Esc em `document` e foco devolvido a quem abriu. Motivo: `src/components/Users/` não tinha modal acessível para reusar (o `UserFormModal` só trata Esc no próprio elemento). A alternativa descartada foi duplicar a lógica dentro do `StudentDeleteDialog`.
- A validação de UUID fica centralizada em `src/utils/uuid.ts` (`isUuid`), usada pela listagem e pelo detalhe. Motivo: os ids do banco são `uuid()`, e o backend responde 400 para qualquer outro formato.
- No detalhe do aluno, id inválido na URL mostra "Aluno não encontrado" sem chamar a API. Um 400 no `GET /api/students/:id` também vira "não encontrado", porque só acontece com id malformado.
- Contrato do `InlineEditField`: `onSave(value) => Promise<string | null>`, com `null` no sucesso e a mensagem de erro no erro. Assim o campo reverte o valor e mostra a mensagem sozinho, e dados pessoais e anotações usam o mesmo componente.
- A edição inline envia no PUT só o campo editado. Não dispara se o valor aparado não mudou. Telefone e CPF vazios vão como `null`.
- Depois de salvar, a tela usa a resposta do servidor (inclusive CPF só com dígitos e `updatedAt`) e mantém cursos, oportunidades e tarefas já carregados, sem recarregar o detalhe.
- O mapeamento de erro por campo fica em `studentErrors.ts` (`studentFieldErrorMessage`): 409 `EMAIL_IN_USE` e 409 `CPF_IN_USE` têm mensagens próprias; 400 `VALIDATION_ERROR` usa `details` do campo ou a mensagem geral.
- Ações de sprints futuras ("Enviar e-mail", "Nova tarefa") ficam com `aria-disabled` e uma descrição acessível dizendo a sprint em que chegam, sem nenhuma lógica por trás.
- `StudentDetailCard` é a moldura comum dos cards: uma `section` rotulada pelo título, que vira landmark `region`.
- `StudentTasksCard` recebe `now` injetável para calcular "Vencida" de forma determinística nos testes.
- No textarea de anotações, Enter quebra linha e Ctrl+Enter salva; o blur também salva.

## padrao
- TDD: o teste em `tests/src/**` falha primeiro (`npx jest --selectProjects web`), depois implementação e refatoração.
- O debounce é testado com `jest.useFakeTimers()` e `act(() => jest.advanceTimersByTime(300))`, nunca com timer real.
- Componentes em `src/components/Students/` são nomeados como substantivo + sufixo (`StudentProfileCard`, `StudentCoursesCard`, `StudentLeadsCard`, `StudentTasksCard`, `StudentNotesCard`, `StudentDetailSkeleton`, `InlineEditField`); helpers ficam em camelCase (`studentFormat.ts`, `studentErrors.ts`).
- Um arquivo de teste por componente de card; o `StudentDetailCards.test.tsx` agrupado foi dividido.
- As fixtures ficam em `tests/src/components/Students/studentFixtures.ts` (`makeStudent`, `makeStudentDetail`, `STUDENT_ID` com UUID válido).
- Services não usam cast na resposta do `apiClient`: fazem checagem explícita do corpo, como o `usersService`.
- Formatação centralizada em `studentFormat.ts`: `formatDateOnly` para datas sem hora (não desloca pelo fuso), mais `formatDateTime`, `formatCurrency` e `LEAD_STATUS_LABELS`.
- A prop `hideLabel` aplica `sr-only` no rótulo quando o título do card já identifica o campo, mantendo o nome acessível.
- Skeleton com `role="status"`, `aria-busy` e texto `sr-only`.
- Verificação final: `npm run typecheck`, `npx jest --selectProjects web --silent` e `npm run build` (com `--turbopack`).

## falha
- Criar arquivos de teste/TSX via heredoc no Bash (`cat <<'EOF'`, `python - <<'EOF'`) quebrou com "unexpected EOF while looking for matching `''" quando o conteúdo tinha apóstrofos; o arquivo não foi criado. Usar a ferramenta Write/Edit para esse tipo de conteúdo.
- O warning intermitente de `act(...)` na `StudentsPage` (2 de várias execuções da suíte completa) não foi isolado: filtrar com `-t` pelo nome e excluir testes com regex de lookahead não o reproduziram. A hipótese, não confirmada, é o `waitFor` que confere só os parâmetros, com a resposta chegando depois do fim do teste.
- `src/components/Users/UserFormModal` não serve como modal acessível reutilizável: só trata Esc no próprio elemento, sem Tab preso nem retorno de foco.
- A edição inline não foi validada contra o PUT real (TASK-008 em andamento); só contra o service mockado.
- Não houve E2E para a tela de detalhe; `npm run e2e` não foi rodado.
