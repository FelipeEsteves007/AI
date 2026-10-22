---
sprint: 6
status: planejada
origem: 001 TASK-007 a 011
---

# Sprint 6 — Domínio de alunos

> Detalhe de cada tarefa em [[001-crm-alunos/tasks|tasks da 001]]. Voltar para o [[Roadmap]].

## Objetivo

O coração do CRM: os models de negócio no banco e o CRUD de alunos, backend e frontend, já com
RBAC de verdade — vendedor vê só os seus, só admin exclui.

## Pré-requisito

[[sprint-5-e2e-fechamento-002|Sprint 5]] fechada. Todo endpoint desta sprint usa o `requireAuth` e
o `requirePermission` da 002.

## Tarefa 0 — Models de negócio (resto da TASK-002)

Antes das cinco tarefas, uma migration nova com os models que faltam: `Student`, `Course`,
`Purchase`, `PipelineLead`, `Task` e os enums `StudentStatus`, `LeadStatus`, `TaskPriority`.
Definições em [[data-model]].

⚠️ **Três conflitos a resolver antes de escrever o schema** — o `data-model.md` da 001 foi escrito
antes da 002 e não sabe dela:

| Conflito | O que fazer |
|----------|-------------|
| O `data-model.md` define um `User` próprio, com `password`, `cuid()` e sem `@@map` | **Ignorar esse `User`.** Vale o da 002 (`passwordHash`, `uuid()`, `tokenVersion`, `@@map("Users")`). Nesta migration só **acrescentar as relações inversas** `students`, `tasks` e `pipelineLeads` ao User existente |
| A 001 usa `cuid()` e a 002 usa `uuid()` | Escolher um e registrar. Sugestão: `uuid()` nos novos também, para o projeto inteiro ficar coerente |
| `Student.email` não tem `@unique` no schema, mas a TASK-008 exige e-mail único (409 em duplicata) | Adicionar `@unique` — senão a regra vira validação de aplicação, que corre atrás em importação concorrente |

Atualizar o [[data-model]] com a decisão tomada, para não repetir a confusão na Sprint 7.

## Tarefas

| ID | Tarefa | SP | Depende de |
|----|--------|----|------------|
| TASK-007 | Listar alunos (backend): filtros, paginação, ordenação, RBAC | 5 | Tarefa 0 |
| TASK-008 | Criar/editar aluno (backend): e-mail e CPF únicos e válidos | 4 | Tarefa 0 |
| TASK-009 | Deletar aluno (backend): cascata, só admin | 2 | Tarefa 0 |
| TASK-011 | Listagem de alunos (frontend): tabela, busca, filtros | 5 | TASK-007 |
| TASK-010 | Detalhe do aluno (frontend) | 5 | TASK-007 |

**21 SP.**

## Ordem sugerida

Backend inteiro primeiro (007 → 008 → 009), depois a listagem (011) e por último o detalhe (010),
que é a tela mais pesada e a que mais se beneficia de a API já estar estável.

## Definição de pronto

- [ ] Migration dos models de negócio aplicada, `data-model.md` atualizado com as decisões acima
- [ ] `GET /api/students` devolve 50 por página por padrão; `?page` e `?limit` funcionam
- [ ] Filtros `status`, `search` (nome/e-mail, sem diferenciar maiúsculas) e `assignedTo` funcionam,
      inclusive combinados
- [ ] **Vendedor vê apenas os próprios alunos** — testado na API, não só na tela
- [ ] **Vendedor recebe 403 ao excluir**; só admin exclui
- [ ] Excluir aluno leva junto compras, tarefas e leads (cascata verificada no banco)
- [ ] E-mail duplicado → 409; e-mail inválido → 400; CPF inválido (dígitos verificadores) → 400;
      CPF duplicado → 409
- [ ] `updatedAt` muda ao editar
- [ ] Listagem responde em < 500 ms com 3.000 registros
- [ ] Frontend: busca com debounce de 300 ms, paginação, ações por linha, skeleton de carregamento,
      tabela vira cards no mobile
- [ ] Detalhe: dados pessoais, cursos, oportunidades, tarefas e anotações; edição inline salva
- [ ] `npm run typecheck && npm test && npm run test:coverage && npm run e2e && npm run build` verde

## Riscos e armadilhas

- **Performance com 3.000 alunos** é critério de aceitação, não detalhe. Criar os índices na
  própria migration e medir com volume real, não com 10 registros de seed.
- **O RBAC do vendedor é um dos testes críticos do `CLAUDE.md`.** Tem que ser filtro na query, não
  filtro na resposta — senão a paginação mente.
- **Validação de CPF é dígito verificador**, não só quantidade de caracteres.
- Cascata de exclusão apaga dados de verdade. Confirmar o comportamento com o Adriano antes de
  soltar em produção.

## Entrega

CRUD de alunos completo, com RBAC comprovado.

Próxima: [[sprint-7-importacao-cursos-compras|Sprint 7 — Importação, cursos e compras]].

---

## Decisões do orquestrador (2026-09-12)

Tomadas na abertura da sprint para destravar conflitos entre documentos. Valem sobre o
[[data-model]] e o [[001-crm-alunos/contracts/api|contrato da 001]] onde divergirem.

| # | Conflito | Decisão |
|---|----------|---------|
| S6-1 | 001 usa `cuid()`, 002 usa `uuid()` | `uuid()` em todos os models |
| S6-2 | `Student.email` sem `@unique`, mas a TASK-008 exige 409 | `@unique` no banco |
| S6-3 | [[data-model]] redefine `User` | Ignorado; só relações inversas no `User` da 002 |
| S6-4 | `Task.relatedStudent` com `SetNull`, mas a TASK-009 exige apagar as tarefas | `onDelete: Cascade` |
| S6-5 | A TASK-010 precisa de `GET /api/students/:id`, que nenhuma task de backend lista | Entra na TASK-007 |
| S6-6 | Não existe permissão `students:write` | Admin, CEO e vendedor criam e editam; vendedor só os próprios, com `assignedTo` forçado para si |
| S6-7 | Filtro "Curso" da TASK-011 depende de cursos | Adiado para a [[sprint-7-importacao-cursos-compras\|Sprint 7]] |
| S6-8 | Filtro "Vendedor" precisa listar usuários, e `GET /api/users` é só do admin | Dropdown visível só para admin nesta sprint |

Migration aplicada: `20260912190237_business_models`.

## Contrato fixado para a Sprint 6

Backend e frontend trabalham em paralelo contra esta definição. Mudança aqui exige avisar as duas
trilhas.

Formato de erro (já existente): `{ error: string, code: string, details?: Record<string,string> }`.

### Tipos

```ts
type StudentStatus = 'ativo' | 'inativo' | 'pausado';

interface StudentResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;            // só dígitos, 11 caracteres
  status: StudentStatus;
  notes: string | null;
  lastContactDate: string | null; // ISO 8601
  assignedTo: string | null;      // id do User
  assignedToName: string | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}

interface StudentDetailResponse extends StudentResponse {
  courses: { id: string; name: string; purchaseDate: string /* YYYY-MM-DD */; amount: number }[];
  pipelineLeads: { id: string; status: 'prospecting' | 'negotiation' | 'sold' | 'lost'; value: number | null; createdAt: string }[];
  tasks: { id: string; title: string; dueDate: string; completed: boolean }[];
}

interface StudentListResponse {
  data: StudentResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface CreateStudentRequest {
  name: string;                 // 1..255
  email: string;
  phone?: string | null;
  cpf?: string | null;          // aceita com ou sem máscara; gravado só com dígitos
  status?: StudentStatus;       // padrão 'ativo'
  notes?: string | null;
  assignedTo?: string | null;   // ignorado para vendedor (vira o próprio id)
}

type UpdateStudentRequest = Partial<CreateStudentRequest>; // ao menos um campo
```

### Endpoints

| Método e rota | Quem | Sucesso | Erros |
|---|---|---|---|
| `GET /api/students` | todos (vendedor: só os próprios, **filtro na query**) | 200 `StudentListResponse` | 400 `VALIDATION_ERROR` |
| `GET /api/students/:id` | todos (vendedor: aluno de outro → **404**, não 403, para não revelar existência) | 200 `StudentDetailResponse` | 404 `NOT_FOUND` |
| `POST /api/students` | todos | 201 `StudentResponse` | 400 `VALIDATION_ERROR`, 409 `EMAIL_IN_USE`, 409 `CPF_IN_USE` |
| `PUT /api/students/:id` | todos (vendedor: só os próprios; não reatribui) | 200 `StudentResponse` | 400, 404, 409 `EMAIL_IN_USE`, 409 `CPF_IN_USE` |
| `DELETE /api/students/:id` | só admin (`students:delete`) | 204 | 403 `FORBIDDEN`, 404 `NOT_FOUND` |

Query de `GET /api/students`: `page` (padrão 1), `limit` (padrão 50, máx. 500), `status`,
`search` (nome ou e-mail, sem diferenciar maiúsculas), `assignedTo` (ignorado para vendedor),
`sortBy` (`name` \| `createdAt` \| `status`, padrão `createdAt`), `order` (`asc` \| `desc`, padrão `desc`).

Toda rota exige sessão (`requireAuth`); senha provisória recebe 403 `PASSWORD_CHANGE_REQUIRED`.

### Refinamentos aceitos após a TASK-007

| Ponto | Comportamento |
|-------|---------------|
| `GET /api/students/:id` com id que não é uuid | 400 `VALIDATION_ERROR` (igual ao `/api/users`) |
| `?assignedTo` que não é uuid | 400; para vendedor é validado e depois ignorado |
| `search` vazio ou só espaços | Tratado como sem busca; máximo 255 caracteres |
| Ordem das listas do detalhe | `courses` e `pipelineLeads` do mais recente ao mais antigo; `tasks` pelo vencimento mais próximo, incluindo as concluídas |
| `sortBy=status` | Ordem do enum (`ativo`, `inativo`, `pausado`), não alfabética |


### Refinamentos aceitos após o review da TASK-007

| # | Ponto | Decisão |
|---|-------|---------|
| S6-9 | O detalhe devolvia `pipelineLeads` e `tasks` de outros vendedores quando o aluno era reatribuído | Para vendedor, as listas aninhadas também são filtradas pelo próprio id (`assignedTo`). Admin e CEO veem tudo. Base: "vendedor só os próprios alunos **e leads**" (CLAUDE.md) |
| — | Busca com acento no Postgres | Banco de dev com locale `en_US.utf8`: `ILIKE` casa `JOÃO` com `joão` (verificado). **Conferir o locale do banco de produção no deploy.** Busca sem acento (`joao` → `João`) não existe — exigiria `unaccent`; fica como melhoria |

### Refinamentos aceitos após o review da TASK-008

| # | Ponto | Decisão |
|---|-------|---------|
| S6-10 | Admin/CEO conseguiam atribuir aluno a usuário desativado — o aluno sumia da carteira de todo vendedor ativo | Atribuição **nova** (POST, ou PUT que muda o `assignedTo`) exige usuário ativo → 400. Manter um responsável que já ficou inativo continua permitido. Papel admin/CEO como responsável é aceito |
| S6-11 | PUT conferia o escopo e gravava em passos separados: `P2025` virava 500 e o vendedor podia gravar num aluno reatribuído no meio | O `update` leva o escopo no `where`; `P2025` → 404 `NOT_FOUND`. Mesmo tratamento no DELETE |
| — | String vazia em `phone`, `cpf`, `notes` | Vira `null` (limpar o campo). Evita colisão de `""` no `@unique` do CPF |
| — | Admin/CEO criando aluno sem `assignedTo` | Aluno sem responsável (`null`) |
| — | PUT só com campos ignorados (vendedor mandando só `assignedTo`) | 200 sem gravar e sem mudar `updatedAt` |

## Pendências para o fechamento da sprint

Atualizado em 2026-09-12, depois da prévia com 3.000 alunos fictícios (`npm run db:seed-demo`).

- [x] Regenerar o Prisma Client — feito após parar o `dev:api`
- [x] Medir `GET /api/students` com 3.000 registros — **9 a 23 ms** na página padrão e na busca, até 52 ms com `limit=500` (meta < 500 ms)
- [x] RBAC no banco real — vendedora vê só os 883 dela; `?assignedTo=<outro>` ignorado
- [x] Busca com acento no banco real — `JOÃO` acha `joão` (69 resultados)
- [x] Cascata da exclusão no banco real — 2 compras, 1 lead e 1 tarefa somem com o aluno; vendedor e CEO recebem 403 sem apagar nada *(verificação manual)*
- [x] S6-10 no banco real — atribuir a vendedor desativado → 400
- [x] E-mail duplicado com maiúsculas no banco real → 409
- [x] **Auditoria da exclusão de aluno** (aprovada em 2026-09-14) — `STUDENT_DELETED` no enum (migration `20260914132927_student_deleted_audit`). O log é gravado **na mesma `$transaction`** do delete (`studentModel.delete(id, audit)`): se a auditoria falhar, a exclusão é desfeita — provado no Postgres real. `metadata = { student: { id, name, email }, cascade: { purchases, pipelineLeads, tasks } }`; `email`/`targetUserId` do log ficam vazios (servem ao bloqueio de login da RN-07). 404 não grava auditoria
- [x] Teste automatizado de integração do `studentModel` contra `crm_alunos_test` — `npm run test:integration` (`jest.integration.config.js`, `tests/integration/`, fora do `npm test`). Trava: aborta se o banco não terminar em `_test`
  - **Bug achado e corrigido:** `%` e `_` na busca funcionavam como curinga (`"100%"` trazia `Desconto 1000`). O Prisma não escapa o `contains`; o model agora usa `escapeLikePattern`
  - Confirmado: `"JOÃO"` casa `joão`, mas **`"joao"` não casa `joão`** (sem `unaccent`)
- [ ] Teste de rota do DELETE conferindo o `snapshot()` do fake após o 204
  *(a rota ganhou testes de auditoria — log gravado e "auditoria falha → 500 e o aluno continua" —, mas a conferência dos filhos apagados no `snapshot()` após o 204 continua só no teste de integração)*
- [x] E2E da Sprint 6 — `tests/e2e/students.spec.ts`, 6 cenários: criar/buscar/editar inline, duplicidade e CPF inválido, escopo do vendedor (404 por URL), CEO e vendedor sem Excluir (403), admin exclui com confirmação e o `AuditLog` fica no banco
- [x] Verificação completa em 2026-09-14: typecheck ok · 674 unitários · cobertura 94,99% · 34 integração · 22 E2E · build ok

### Lacuna de planejamento encontrada no fechamento

- **Não existe tela de cadastro de aluno.** O UC-4.3 da [[001-crm-alunos/spec|spec]] pede "+ Novo Aluno", mas o `tasks.md` só tem o backend (TASK-008). **Decisão do Adriano (2026-09-14): seguir o plano como está, sem a tela.** Alunos entram pela importação CSV ([[sprint-7-importacao-cursos-compras|Sprint 7]]) ou pela API
- UC-4.2 "histórico de alterações (quem editou, quando)" — também sem task; fica fora, pela mesma decisão

Nota de padrão: serviços de escrita **destrutiva** repetem a checagem de permissão no service além do `requirePermission` da rota (defesa em profundidade). A importação da [[sprint-7-importacao-cursos-compras|Sprint 7]] segue o mesmo caminho.

Capturas da prévia: `assets/sprint-6/`.
