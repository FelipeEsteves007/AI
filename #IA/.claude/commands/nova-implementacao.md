---
description: Entrevista, planeja (sprints, impacto, TDD, plano de QA), pede aprovação e implementa uma nova feature com testes e relatório final
argument-hint: "[descrição curta da feature (opcional)]"
---

# /nova-implementacao

Você vai conduzir uma nova implementação neste projeto, do levantamento ao relatório final.
Ponto de partida informado pelo desenvolvedor (pode estar vazio): **$ARGUMENTS**

Siga as fases **na ordem**. Não pule a entrevista nem a aprovação. **Nenhum código de produção
é escrito antes da aprovação explícita do plano (Fase 3).**

---


## Protocolo de identificação (obrigatório)

Abra cada mensagem sua com `🧭 orquestrador`. Ao despachar um agent, anuncie
`🧭 orquestrador → 🤖 <agent> · <o que vai fazer>`; ao receber o retorno,
`🤖 <agent> → 🧭 orquestrador · <resultado>`. Preserve a linha `🤖 agent: <nome>` dos
relatórios dos agents e atribua cada alteração ao agent que a fez.
## Fase 0 — Contexto (silenciosa, antes da primeira pergunta)

1. Leia `CLAUDE.md` (stack, estrutura, padrões, TDD, **Nunca fazer**, decisões em aberto).
2. Leia `ImersaoIA/memory/constitution.md` e `ImersaoIA/README.md`.
3. Liste `ImersaoIA/specs/` para descobrir o próximo número de feature (`001`, `002`, …).
4. Leia as specs existentes que possam ter relação com o pedido e explore o código afetado
   (`src/`, `server/`, `prisma/`, `tests/`) para não perguntar o que o projeto já responde.

## Fase 1 — Entrevista

- Faça **uma pergunta por vez**, no formato **Pergunta X/Y**. Estime Y no início e ajuste se precisar
  (avise quando mudar).
- Cubra obrigatoriamente, pulando o que o `$ARGUMENTS` ou o código já responderam:
  1. Problema que a feature resolve e quem sofre com ele hoje
  2. Papéis envolvidos (admin, CEO, vendedor) e o que cada um pode ver e fazer (RBAC)
  3. Comportamento esperado: fluxo principal e fluxos alternativos e de erro
  4. Regras de negócio e validações
  5. Dados: entidades novas ou alteradas (sem desenhar o schema na entrevista)
  6. Telas afetadas ou novas
  7. Endpoints de API afetados ou novos
  8. O que está **fora do escopo**
  9. Critérios de aceitação: como o desenvolvedor vai saber que ficou pronto
- Quando a resposta for vaga, proponha 2 ou 3 opções concretas em vez de perguntar em aberto.
- **Não invente requisitos.** O que não for respondido vira **decisão em aberto**.
- Se o pedido conflitar com o `CLAUDE.md` ou a constitution (ex.: integração com Hotmart,
  WhatsApp, e-mail em massa), aponte o conflito e pergunte antes de seguir.
- Ao ter informação suficiente, diga que está pronto para gerar o plano e peça confirmação.

## Fase 2 — Plano de execução

Crie a pasta `ImersaoIA/specs/NNN-slug-curto/` (padrão GitHub Spec Kit) com:

### `spec.md` — o quê e por quê
Problema · Usuários e papéis · Funcionalidades (essenciais / fora do escopo) · Regras de negócio ·
Cenários de uso (fluxo principal, alternativos, erro) · Critérios de aceitação · Decisões em aberto.

### `plan.md` — como, com análise de impacto
- **Abordagem técnica** coerente com a stack e os padrões do `CLAUDE.md`.
- **Análise de impacto no sistema**, baseada em leitura real do código (cite os caminhos):
  - Arquivos e módulos que serão **criados** e **alterados**
  - Banco: models do Prisma e migrations (e se a migration é destrutiva)
  - API: endpoints novos ou alterados e mudanças de contrato (atualizar `contracts/`)
  - RBAC: quais papéis ganham ou perdem acesso
  - Frontend: páginas e componentes afetados
  - Dependências novas (versão e motivo) — só com necessidade real
  - Riscos, regressões possíveis e como mitigar
- **Estratégia de TDD**: para cada comportamento, qual teste nasce primeiro e em que camada
  (`tests/server/**` Jest node, `tests/src/**` Jest jsdom, `tests/e2e/**` Playwright).

### `tasks.md` — sprints e tarefas
- Tarefas `TASK-NNN` agrupadas em **sprints**, cada uma com: descrição, dependências,
  subtarefas e **testáveis** (o teste que prova que a tarefa está pronta).
- Ordem TDD em cada tarefa: **teste falhando → implementação mínima → refatoração**.
- Cada sprint termina com um critério de pronto verificável.

### `qa-test-plan.md` — plano de testes para o QA
1. **Montagem do ambiente**: pré-requisitos (Node, PostgreSQL), `npm install`,
   `cp .env.example .env.local` e o que preencher, `npm run db:migrate`, seeds necessários,
   `npm run dev:api` + `npm run dev`, URLs, e **um usuário de teste por papel**.
2. **Massa de dados**: dados **fictícios** (CPFs e e-mails gerados, nunca dados reais de alunos),
   com arquivos de exemplo quando a feature tiver importação.
3. **Casos de teste** em tabela: ID · Papel · Pré-condição · Passos · Resultado esperado.
   Inclua fluxo feliz, erros e validações, limites e **matriz de permissões por papel**.
4. **Regressão**: o que já existia e precisa ser retestado por causa do impacto.
5. **Critério de aceite do QA** e como reportar bugs (passos, esperado × obtido, evidência).

Atualize `ImersaoIA/README.md` com a nova pasta de feature.

## Fase 3 — Aprovação

Apresente um resumo curto: objetivo, sprints e tarefas (com contagem), principais impactos e
riscos, testes críticos e decisões em aberto, com links para os 4 arquivos. Pergunte:
**aprovar**, **ajustar** (diga o quê) ou **cancelar**.

- **Ajustar**: altere os arquivos e apresente de novo.
- **Cancelar**: pare. Não apague os arquivos sem o desenvolvedor pedir.
- Só avance com um "aprovado" explícito.

## Fase 4 — Implementação

Siga o `tasks.md`, sprint por sprint, tarefa por tarefa. **Comunique cada etapa**:

- Antes: `▶ Sprint N · TASK-NNN — <o que vai fazer e em quais arquivos>`
- Ciclo TDD visível:
  1. `🔴` escreve o teste e **roda para ver falhar** (mostre o motivo da falha)
  2. `🟢` implementa o mínimo e roda até passar
  3. `♻️` refatora mantendo verde
- Depois: `✅ TASK-NNN concluída — <resultado em uma linha>` e marque o checkbox no `tasks.md`.
- No fim de cada sprint: resumo curto e rodada de `npm test`.
- Se surgir algo fora do plano (requisito novo, decisão em aberto bloqueando, impacto não previsto),
  **pare e pergunte** — não decida sozinho.

Regras durante a implementação:
- Respeite todos os itens de **Nunca fazer** do `CLAUDE.md` (RBAC sempre no backend, JWT só em
  cookie HttpOnly, só Prisma, sem `console.log` em produção, Next sempre com `--turbopack`, etc.).
- Siga os padrões de código do `CLAUDE.md` e os aliases `@/` e `@server/`.
- Não crie funcionalidade além do escopo aprovado.
- Não faça commit nem push sem o desenvolvedor pedir.
- No Windows, ao gerar arquivos com acentuação via script, use Node (UTF-8), não o PowerShell 5.1.

## Fase 5 — Verificação e autocorreção

Rode a linha de verificação do `CLAUDE.md`:

```
npm run typecheck && npm test && npm run test:coverage && npm run e2e && npm run build
```

Para cada falha:
1. Leia a saída, encontre a **causa raiz** (não o sintoma) e corrija.
2. Rode de novo a verificação.
3. Máximo de **3 tentativas por falha**; se persistir, pare e explique ao desenvolvedor o
   diagnóstico e as opções.

**Proibido para "fazer passar"**: apagar ou pular testes (`.skip`, `.only`), afrouxar asserções,
baixar o limite de cobertura de 70%, usar `any`/`@ts-ignore` para calar erro de tipo ou mudar
a regra de negócio aprovada.

## Fase 6 — Relatório final

Apresente e salve em `ImersaoIA/specs/NNN-slug-curto/report.md`:
- **O que foi implementado**, por tarefa, com status (concluída / parcial / não feita e por quê)
- **Arquivos criados e alterados**
- **Resultado real da verificação**: cada comando com seu resultado e a cobertura obtida
  (sem arredondar para cima nem omitir falhas)
- **Autocorreções feitas** na Fase 5 (o que falhou e como foi resolvido)
- **Desvios do plano** e o motivo
- **Decisões em aberto** e pendências
- **Próximo passo**: entregar o `qa-test-plan.md` ao QA

Se a feature criou convenções novas ou mudou a estrutura, atualize o `CLAUDE.md` e a spec.
