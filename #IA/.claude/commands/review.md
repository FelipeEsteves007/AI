---
description: Revisa o código com o @code-reviewer usando a spec e o plan da feature como referência, classificando os achados em BLOQUEANTE, IMPORTANTE e SUGESTÃO
argument-hint: "[feature, task ou caminho — ex.: 002, TASK-205, server/services/authService.ts (opcional)]"
---

# /review

Escopo informado pelo desenvolvedor (pode estar vazio): **$ARGUMENTS**

> Neste projeto a spec e o plan **não ficam na raiz**: cada feature tem os seus em
> `ImersaoIA/specs/<NNN-feature>/spec.md`, `plan.md` e `tasks.md`. É esse par que serve de
> referência da revisão.


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
## Fase 1 — Determinar o escopo

1. Se `$ARGUMENTS` trouxer um **número/nome de feature** (`002`, `login-perfis`), revise o que
   essa feature toca. Se trouxer uma **task** (`TASK-205`), leia-a no `tasks.md` e revise
   apenas os arquivos que ela nomeia. Se trouxer **caminhos**, revise esses arquivos.
2. Se vier vazio: identifique a feature com trabalho em andamento (o `tasks.md` mais recente
   com checkboxes marcados) e os arquivos alterados mais recentemente em `server/`, `src/`,
   `prisma/` e `tests/`. O projeto **não é um repositório Git** — não tente `git diff`; use
   data de modificação e o `tasks.md`.
3. Se o escopo continuar ambíguo, **pergunte antes de revisar** — não revise o projeto inteiro
   por engano.

## Fase 2 — Despachar o @code-reviewer

Invoque o agent **code-reviewer** (subagent_type `code-reviewer`) passando no prompt:

- o escopo resolvido: lista explícita de arquivos a revisar;
- os caminhos de referência: `ImersaoIA/specs/<NNN>/spec.md`, `ImersaoIA/specs/<NNN>/plan.md`,
  `ImersaoIA/specs/<NNN>/tasks.md`, mais `contracts/api.md` e `data-model.md` se existirem;
- `CLAUDE.md` e `ImersaoIA/memory/constitution.md` como padrões obrigatórios;
- a instrução de rodar `npm run typecheck` e `npm test` e colar o resultado real;
- a instrução de **não alterar arquivo nenhum** — o produto é o relatório.

Para escopo grande e separável (backend + frontend + schema), pode despachar **mais de um
code-reviewer em paralelo**, um por camada, numa única mensagem, e consolidar os relatórios.

## Fase 3 — Consolidar e apresentar

Apresente o relatório final classificado, do mais grave para o menos:

```
## Review — <escopo>

**Veredito**: APROVADO | APROVADO COM RESSALVAS | REPROVADO
🔴 Bloqueantes: N · 🟡 Importantes: N · 🟢 Sugestões: N

### 🔴 BLOQUEANTE
<achados: título, arquivo:linha, o que quebra, referência na spec/CLAUDE.md, correção sugerida>

### 🟡 IMPORTANTE
### 🟢 SUGESTÃO

### Verificação
`npm run typecheck` → … · `npm test` → … · cobertura → …
```

Regras da classificação:

- **🔴 BLOQUEANTE** — falha de segurança ou de RBAC, violação de um item de "Nunca fazer" do
  `CLAUDE.md`, requisito da spec não implementado, bug no fluxo principal, teste crítico
  ausente, `typecheck`/`test`/`build` quebrado.
- **🟡 IMPORTANTE** — desvio de padrão, cobertura fraca, tratamento de erro pobre, dívida
  técnica próxima.
- **🟢 SUGESTÃO** — melhoria opcional de nome, estrutura ou simplificação.

Na dúvida entre dois níveis, use o menor e justifique.

## Fase 4 — Fechamento

- **Não corrija nada automaticamente.** Ao final, pergunte se o desenvolvedor quer que os
  bloqueantes sejam corrigidos agora — e só então despache o agent do módulo correspondente.
- Se houver zero achados, diga isso sem inventar problema.
- Se algum comando de verificação não foi rodado, declare explicitamente que não foi.
