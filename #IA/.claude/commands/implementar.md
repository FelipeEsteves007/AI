---
description: Lê a task no tasks.md da feature, despacha o agent do módulo certo, enforça TDD e dispara o @code-reviewer automaticamente ao final
argument-hint: "<task> — ex.: TASK-205, 002/TASK-207, ou a próxima task pendente se vazio"
---

# /implementar

Task pedida: **$ARGUMENTS**

> Neste projeto o plano de tarefas **não é um `PLAN.md` na raiz**: cada feature tem o seu em
> `ImersaoIA/specs/<NNN-feature>/tasks.md`, com `spec.md` e `plan.md` ao lado.


## Protocolo de identificação (obrigatório)

Quem está falando tem de estar sempre visível no chat.

- **Você é o orquestrador.** Abra cada mensagem sua com `🧭 orquestrador` na primeira linha.
- **Antes de cada despacho**, anuncie o gate: `🧭 orquestrador → 🤖 <agent> · <o que vai fazer>`.
- **Ao receber o retorno**, anuncie a volta e o veredito: `🤖 <agent> → 🧭 orquestrador · <resultado>`.
- Ao repassar o relatório de um agent, **mantenha a linha `🤖 agent: <nome>` dele** — não
  reescreva como se fosse seu.
- Em despacho paralelo, nomeie todos os agents antes de começar e identifique cada retorno.
- Nunca deixe o desenvolvedor adivinhar quem executou uma ação: cada arquivo alterado, cada teste
  rodado e cada bloqueio de hook é atribuído ao agent que o fez.
## Fase 0 — Contexto

1. Leia `CLAUDE.md` (padrões, TDD, **Nunca fazer**, decisões em aberto) e
   `ImersaoIA/memory/constitution.md`.
2. Localize a task: procure o identificador em todos os `ImersaoIA/specs/*/tasks.md`. Se
   `$ARGUMENTS` vier vazio, assuma a **primeira task pendente** (checkbox desmarcado) cuja
   dependência já esteja concluída — e **confirme com o desenvolvedor** antes de começar.
3. Leia, da mesma feature: `spec.md` (requisitos e RBAC), `plan.md` (decisões técnicas
   aprovadas) e, quando existirem, `contracts/api.md`, `data-model.md` e `ui/`.
4. Leia o `ImersaoIA/handoff.md` para saber o estado do ambiente (o Postgres é um container Docker
   no WSL e pode estar parado).

## Fase 1 — Verificar se dá para começar

Pare e pergunte, em vez de adivinhar, se:

- a task depende de outra ainda **não concluída** (o `tasks.md` diz "Depende de");
- a task depende de uma **decisão em aberto** do `CLAUDE.md` (biblioteca de validação, de
  logging, convenção de caixa) ou de uma decisão do `plan.md` ainda não aprovada;
- a task conflita com a seção **Nunca fazer** do `CLAUDE.md`.

## Fase 2 — Escolher o agent do módulo

| Natureza da task | Agent |
|---|---|
| Schema Prisma, migration, seed, índice, relação | `database-prisma` |
| Rota, controller, service, middleware, RBAC, autenticação (`server/`) | `backend-api` |
| Componente, página, hook, Context, service HTTP (`src/`) | `frontend-ui` |
| Suíte de testes, cobertura, E2E (`tests/`) | `qa-testes` |

Task que atravessa camadas: quebre em etapas **na ordem das dependências**
(schema → backend → frontend) e despache um agent por etapa, **em sequência** — cada um só
começa com o anterior verde. Etapas independentes entre si podem ir em paralelo, numa única
mensagem.

No prompt de cada agent, passe: o texto integral da task (subtarefas e o bloco "Testável"), os
caminhos de spec/plan/contracts relevantes e a exigência de TDD abaixo.

## Fase 3 — TDD (não negociável)

Cada agent segue, por subtarefa:

1. 🔴 **Teste primeiro**, em `tests/server/**` ou `tests/src/**` espelhando o caminho do código.
   Rodar `npm test` e **ver falhar** — a saída da falha vai no relatório do agent.
2. 🟢 **Implementação mínima** para o teste passar.
3. ♻️ **Refatoração** com os testes verdes.

Rejeite o resultado e mande refazer se o agent:

- escreveu implementação antes do teste;
- não colou a saída real de `npm test`;
- afirmou "passou" sem evidência;
- ajustou o teste para caber num código errado.

## Fase 4 — Verificação antes do review

Rode e **cole a saída real**:

```
npm run typecheck && npm test && npm run test:coverage
```

E2E (`npm run e2e`) quando a task mexeu em fluxo de tela. `npm run build` quando mexeu no
frontend. Cobertura abaixo de 70% **é falha** — despache o `qa-testes` antes de seguir.

Se algo estiver vermelho, volte à Fase 3. **Não prossiga para o review com build quebrado.**

## Fase 5 — Review automático (sempre)

Terminada a verificação, **dispare o agent `code-reviewer` automaticamente**, sem perguntar.
Passe a ele: os arquivos criados/alterados, a task, e os caminhos de `spec.md`, `plan.md` e
`tasks.md` da feature.

Apresente o relatório classificado em **🔴 BLOQUEANTE / 🟡 IMPORTANTE / 🟢 SUGESTÃO**
(mesmo formato do `/review`).

- Havendo **bloqueante**: corrija agora, com o agent do módulo, e rode o review de novo. Repita
  até zerar os bloqueantes ou até o desenvolvedor decidir parar.
- Só **importantes/sugestões**: liste e pergunte o que fazer. Não corrija por conta própria.

## Fase 6 — Fechamento

1. Marque no `tasks.md` os checkboxes concluídos — **só os realmente entregues e verificados**.
2. Resumo final: task, arquivos criados/alterados, testes adicionados, resultado de cada
   comando de verificação, veredito do review e o que ficou pendente (com o motivo).
3. Se a task levantou decisão nova, registre-a em "Decisões em aberto" do `CLAUDE.md`.
4. Não dê commit nem push sem o desenvolvedor pedir (o projeto ainda nem é um repositório Git).
