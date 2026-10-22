# Relatório — 001 CRM de Alunos

Feature entregue em 2026-09-14, nas Sprints 6 a 9 do [[Roadmap]]. Escopo em [[001-crm-alunos/spec|spec]],
plano em [[001-crm-alunos/plan|plan]] e tarefas em [[001-crm-alunos/tasks|tasks]]. Login e perfis vieram
antes, na [[002-login-perfis/report|feature 002]].

As Sprints 7, 8 e 9 foram feitas sem subagentes, por orientação do Adriano: é um projeto de aula,
"seguir o plano como está", sem sofisticar o que não foi pedido.

## O que foi implementado

| Tarefa | Entrega | Sprint | Status |
|--------|---------|--------|--------|
| TASK-007 | `GET /api/students` e detalhe, com RBAC na query | 6 | ✅ |
| TASK-008 | Criar e editar aluno (API). **Sem tela de cadastro**, por decisão | 6 | ✅ |
| TASK-009 | Excluir aluno com cascata e auditoria na mesma transação | 6 | ✅ |
| TASK-010 | Detalhe do aluno com edição inline | 6 | ✅ |
| TASK-011 | Listagem com busca, filtros e paginação | 6 | ✅ |
| TASK-012 | Importação CSV linha a linha, com relatório e auditoria | 7 | ✅ |
| TASK-013 | Tela `/settings/import` com preview, progresso e erros em CSV | 7 | ✅ |
| TASK-014 | CRUD de cursos; curso com compras não é excluído | 7 | ✅ |
| TASK-015 | Tela `/courses` | 7 | ✅ |
| TASK-016 | Registrar compra (sem duplicar e sem data futura) | 7 | ✅ |
| TASK-017 | Listar compras do aluno | 7 | ✅ |
| TASK-018 | "+ Adicionar curso" no detalhe do aluno | 7 | ✅ |
| TASK-019 | Métricas do dashboard (71 ms com 3.000 alunos) | 8 | ✅ |
| TASK-020 | Dashboard com KPIs e gráficos (`recharts`) | 8 | ✅ |
| TASK-021 | Pipeline de leads com RBAC e totais por status | 8 | ✅ |
| TASK-022 | Kanban com arrastar e soltar e reversão otimista | 8 | ✅ |
| TASK-023 | Tarefas: CRUD, concluir e filtros; cada um vê só as próprias | 8 | ✅ |
| TASK-024 | Tela `/tasks` agrupada por prazo | 8 | ✅ |
| TASK-025 | `POST /api/email/send` com auditoria e 502 tratado | 9 | ✅ |
| TASK-026 | `POST /api/email/send-bulk`: seleção manual de até 100, com `{{name}}` e `{{course}}` | 9 | ✅ |
| TASK-027 | Modal de e-mail no detalhe e na listagem (seleção) | 9 | ✅ |
| TASK-028 | Exportação CSV para Excel, com os filtros da tela e só para admin e CEO | 9 | ✅ |
| TASK-033 | Repositório privado no GitHub e CI verde (typecheck, testes, build e E2E) | 9 | 🟡 Falta a proteção de branch, que exige GitHub Pro em repositório privado |
| TASK-034 | Deploy na Vercel com Neon: https://crm-alunos-sable.vercel.app | 9 | ✅ (e-mail ainda simulado: falta `SMTP_*`) |

## Verificação (execução real, 2026-09-14)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | sem erros |
| `npm run test:coverage` | **828 testes**, 75 suítes, **92%** statements · 82,17% branches (mínimo: 70%) |
| `npm run test:integration` | **34 testes** contra o Postgres `crm_alunos_test` |
| `npm run e2e` | **23 testes**, incluindo a jornada login → dashboard → importação → alunos |
| `npm run build` | compilou |

## Testes críticos do `CLAUDE.md`

- [x] RBAC no backend: vendedor não vê alunos de outro e não exclui (unidade, rota e E2E)
- [x] Importação de 3.000 alunos pula as linhas inválidas e relata sucessos, falhas e duplicatas
- [x] Aluno recusa e-mail duplicado ou inválido e CPF inválido ou duplicado
- [x] Compra: sem curso repetido e sem data futura
- [x] Login dos três papéis (feature 002)
- [x] Dashboard com total, alunos por curso, alunos novos, receita e taxa de atividade

## Decisões principais

| # | Decisão |
|---|---------|
| S6-* | Ver [[sprint-6-alunos]]. Destaque: auditoria da exclusão na mesma transação; `%` e `_` escapados na busca |
| — | Sem tela de cadastro de aluno nem histórico de alterações (UC-4.3 e UC-4.2 ficaram sem task) |
| S7-1 | Excluir curso com compras: **bloquear** (409) |
| S7-3 | Importação linha a linha (vale o `CLAUDE.md`, não o "insert all ou rollback") |
| S8-1 | Lead vendido **não** gera compra |
| S8-3 | Taxa de atividade = alunos com status `ativo` / total |
| S8-4 | `Task.relatedTo` só aponta para aluno |
| S9-1 | E-mail para vários alunos só por **seleção manual** (máx. 100); automação continua proibida |
| S9-2 | Logger: **Pino** |
| S9-3 | Exportação só em **CSV** e só para admin e CEO (`data:view-all`), auditada |
| S9-4 | Node **24** no CI (`.nvmrc`); `engines` >= 22 |

## Fora do escopo ou pendente

- Proteção de branch (TASK-033): bloqueada pelo plano gratuito do GitHub em repositório privado
- SMTP de produção: sem `SMTP_*`, o envio de e-mail é simulado
- Next 16 + React 19 (correção do `postcss` vulnerável): não foi feito
- PDF e Excel na exportação, fila de e-mail, notificações e histórico de contatos ficam para a v2
- ~~E2E específico de cursos, pipeline, tarefas e e-mail~~ — `tests/e2e/business.spec.ts` (4 fluxos); suíte E2E com 27 testes. O E2E achou o checkbox de tarefa que só mudava depois da API: agora é otimista, com reversão
