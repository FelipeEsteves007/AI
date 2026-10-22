---
sprint: 9
status: concluida
origem: 001 TASK-025 a 028, 033, 034
---

# Sprint 9 — E-mail, relatórios e deploy

> Detalhe de cada tarefa em [[001-crm-alunos/tasks|tasks da 001]]. Voltar para o [[Roadmap]].

## Objetivo

Fechar o MVP: comunicação com o aluno, exportação de dados e o sistema no ar na Vercel — o ponto
em que dá para cancelar a assinatura do CRM pago.

## Pré-requisito

[[sprint-8-dashboard-pipeline-tarefas|Sprint 8]] fechada.

## Tarefas

| ID | Tarefa | SP | Depende de |
|----|--------|----|------------|
| TASK-033 | GitHub e CI (GitHub Actions, branch protection) | 3 | — |
| TASK-034 | Deploy na Vercel | 2 | TASK-033 |
| TASK-025 | Enviar e-mail individual (backend) | 3 | Sprint 6 |
| TASK-027 | Enviar e-mail (frontend) | 2 | TASK-025 |
| TASK-026 | Enviar e-mail para vários alunos (backend) | 3 | TASK-025 |
| TASK-028 | Exportar alunos em CSV | 3 | Sprint 6 |

**16 SP.**

## Ordem sugerida

**Deploy primeiro** (033 → 034), ao contrário do que o `tasks.md` da 001 sugere. Razões: o CI pega
regressão nas tarefas seguintes em vez de depois; e um deploy que só acontece no último dia é um
deploy que dá errado no último dia. Depois e-mail (025 → 027 → 026) e exportação (028), que são
independentes.

O `git init` local deveria ter acontecido lá na [[sprint-0-base-entregue|Sprint 0]]; aqui é o
remoto, o CI e a proteção de branch.

## ⚠️ Conflito de escopo na TASK-026

A TASK-026 é **enviar e-mail para vários alunos de uma vez**. O `CLAUDE.md` diz, em "Nunca fazer":

> Nunca implementar envio automático de WhatsApp ou SMS nem **automação de e-mail em massa**

Esse conflito está registrado como decisão em aberto do projeto. A leitura que reconcilia os dois:
**envio manual para uma seleção de alunos é permitido; automação — disparo por gatilho, régua,
sequência — não é.** Confirmar com o Adriano **antes** de começar a 026. Se a resposta for não, a
tarefa sai da sprint e sobram 13 SP.

## Definição de pronto

Estado em 2026-09-14 (sessão 4). Relatório final em [[001-crm-alunos/report|report da 001]].

**Deploy e CI**
- [x] `.gitignore` conferido: nenhum `.env.local`/`.env.test` no histórico (`git log --all` vazio para eles)
- [x] Repositório **privado** `adrianosantostreina/crm-alunos` (confirmado pelo Adriano), `master` local rastreando `origin/main`
- [x] Workflow `.github/workflows/ci.yml`: job `verify` (typecheck, testes com cobertura, build) e job `e2e` (Postgres 17 como service, `.env.test` montado no CI com `JWT_SECRET` descartável). Não há script de lint no projeto. **Primeira execução verde nos dois jobs** (run 34869238057)
- [ ] Branch `main` protegida — **bloqueado**: o GitHub só libera proteção de branch em repositório privado no plano Pro (HTTP 403). Alternativas: assinar o Pro, tornar o repo público ou seguir sem proteção
- [x] Projeto `crm-alunos` na Vercel, ligado ao GitHub (push na `main` → deploy de produção). **Produção: https://crm-alunos-sable.vercel.app**
- [x] Variáveis de produção e preview: `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (Neon), `JWT_SECRET` novo e diferente por ambiente, `LOG_LEVEL`. **Sem `API_URL`** (a API roda dentro do Next). **Sem `SMTP_*`**: e-mail simulado em produção até configurar um provedor
- [x] Banco **Neon pelo Marketplace** (`crm-alunos-db`, PostgreSQL 18, só production e preview). 5 migrations aplicadas com `prisma migrate deploy` pela conexão sem pooler; locale `C.UTF-8` e `'JOÃO' ILIKE '%joão%'` = verdadeiro
- [x] App em produção sem 500: login real 200, cookie `HttpOnly; Secure; SameSite=Lax`, `/api/auth/me` 200, rotas de negócio 403 até trocar a senha provisória
- [x] Primeiro admin criado no banco de produção (`adriano@adrianosantostreina.com.br`, senha provisória exibida uma vez)

### Incidentes do deploy (e o que ficou)

| Problema | Correção |
|----------|----------|
| Na Vercel, **todo arquivo da pasta `api/` vira função pública** — o `vercel build` gerou função para cada controller, model e até `seedAdmin`/`server.ts` | `api/` → `server/` (alias `@server/`) e a API montada em `src/pages/api/[...path].ts`: uma função só |
| `API_URL` embutido no build faria o Next tentar proxy para `localhost` em produção | Rewrite só existe com `API_URL` (dev/E2E); `.vercelignore` impede subir `.env*` pela CLI |
| **500 em produção**: `default level:﻿info must be included in custom levels` — o PowerShell 5.1 pôs BOM no valor enviado por pipe ao `vercel env add` (também no `JWT_SECRET`) | Variáveis recriadas pelo Git Bash (`printf`); `resolveLogLevel` tolera BOM/espaços e cai no padrão |
| `current_setting('lc_ctype')` não existe mais no Postgres 17+ | Locale lido de `pg_database.datctype` |

**E-mail e relatórios**
- [x] `POST /api/email/send`: destinatário é o aluno do escopo (não e-mail livre), auditoria `EMAIL_SENT` sem o corpo, falha do provedor → 502 `EMAIL_SEND_FAILED`. Sem `SMTP_HOST`, o envio é simulado
- [x] Modal "Enviar e-mail" no detalhe, com confirmação na tela
- [x] `POST /api/email/send-bulk`: seleção manual de até 100 alunos na listagem, `{{name}}` e `{{course}}` (curso mais recente), resultado por aluno
- [x] `GET /api/reports/students-export?format=csv` respeita status, busca e vendedor
- [x] CSV para Excel: `;`, BOM UTF-8, CRLF e CPF como texto; só admin e CEO; auditoria `STUDENTS_EXPORTED`

**Fechamento**
- [x] Cobertura 92% (mínimo 70%)
- [x] E2E `journey.spec.ts`: login → dashboard → importação → alunos
- [x] Nenhum `console.log` em `api/` e `src/`: o `server.ts` e o `errorHandler` usam o Pino
- [x] `report.md` da feature 001
- [x] [[handoff]] atualizado
- [x] Verificação: typecheck ok · 828 unitários · 34 integração · 23 E2E · build ok

### Decisões desta sprint

| # | Decisão |
|---|---------|
| S9-1 | **Envio para vários alunos permitido só por seleção manual** (máx. 100 por envio). Sem gatilho, régua ou sequência: isso seria a automação proibida |
| S9-2 | **Logger: Pino**, mudo nos testes, com `LOG_LEVEL` |
| S9-3 | **Exportação só em CSV** e só para `data:view-all` (admin e CEO). Vendedor não exporta. Auditada |
| S9-4 | **Node 24** no CI (`.nvmrc`), `engines` >= 22 |
| S9-5 | Corpo do e-mail em texto puro (sem editor rico), convertido em HTML escapado |
| S9-6 | Next 16 + React 19 não entra nesta sprint; o `postcss` vulnerável segue registrado |

### Como publicar (quando confirmado)

1. ~~`gh repo create` privado e push da `master` para `main`~~ — feito em 2026-09-14. Proteção de branch depende do plano (ver acima).
2. Banco pelo Marketplace da Vercel (Neon); `DATABASE_URL` nas variáveis; `prisma migrate deploy`; conferir `LC_CTYPE`.
3. Dois projetos na Vercel: a **API Express** (zero-config para Express) e o **Next**, com `API_URL` apontando para a API, mantendo o proxy `/api` e o cookie de primeira parte.
4. `JWT_SECRET` novo (≥ 32 caracteres), `SMTP_*` do provedor e `db:seed-admin` no banco de produção.
5. Smoke em produção: login, dashboard e alunos sem 500.

## Decisões em aberto que precisam de resposta antes do fim

| Decisão | Impacto |
|---------|---------|
| Envio para vários alunos: dentro ou fora do escopo? | Define se a TASK-026 existe |
| Formatos de exportação: CSV, PDF, Excel? | A TASK-028 assume CSV; PDF está como opcional |
| Banco de produção (a Vercel não hospeda o container do WSL) | Bloqueia a TASK-034 |
| Biblioteca de logging (Pino ou Winston) | Precisa estar decidida antes de produção — a regra é "sem `console.log` em produção" |
| Versão do Node: a documentação fixa Node 20 LTS, fora de suporte desde abril/2026 | Afeta o runtime da Vercel e o CI |
| Next 15 + React 18 arrasta um `postcss` vulnerável; a correção pede Next 16 + React 19 | Decidir se sobe antes de ir a produção |

## Riscos e armadilhas

- **O banco de produção é um buraco no plano.** Todo o projeto foi desenvolvido contra um container
  Docker local. Deixar essa decisão para o dia do deploy é o maior risco desta sprint.
- **Segredos**: conferir que nenhum `.env.local` entrou no histórico antes do primeiro push.
  O `JWT_SECRET` de desenvolvimento não vai para produção.
- **Nunca WhatsApp ou SMS.** Regra do `CLAUDE.md`, sem exceção.
- **O CSV exportado tem CPF e e-mail de 3.000 pessoas.** Definir quem pode exportar (a matriz de
  permissões da 002 já tem onde encaixar isso) antes de liberar o botão.

## Entrega

MVP no ar, em uso pela equipe, com o CRM pago cancelado.

Depois disso, o backlog de v2 está no fim do [[001-crm-alunos/tasks|tasks da 001]]: integração com
a Hotmart, cache, notificações em tempo real e histórico de contatos.
