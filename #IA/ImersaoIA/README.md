# Documentação — CRM de Alunos

Vault do Obsidian do projeto. **Toda** documentação, spec, plano e lista de tarefas vive aqui —
nada de documentação solta na raiz do repositório.

Organizada segundo a convenção do [GitHub Spec Kit](https://github.com/github/spec-kit):
a **constitution** vale para o projeto inteiro e cada feature tem sua pasta numerada em `specs/`.

## Comece por aqui

- [[handoff]] — onde paramos, pendências e próximo passo concreto
- [[Roadmap]] — sequência de execução do projeto, sprint a sprint
- [[constitution]] — princípios e regras que valem para todas as features

## Estrutura

```
ImersaoIA/                        ← este vault (raiz)
├── README.md                     ← este índice
├── handoff.md                    ← estado da sessão: onde paramos e próximo passo
├── sprints/                      ← ROADMAP DE EXECUÇÃO: um documento por sprint
│   ├── Roadmap.md                ← índice e ordem das sprints
│   └── sprint-0 … sprint-9.md    ← objetivo, tarefas, definição de pronto e riscos de cada uma
├── memory/
│   └── constitution.md           ← princípios e regras do projeto
└── specs/
    ├── 001-crm-alunos/           ← feature 001: CRM interno de alunos (MVP)
    │   ├── spec.md               ← O QUÊ e POR QUÊ: problema, usuários, escopo, casos de uso, critérios
    │   ├── plan.md               ← COMO: plano técnico, arquitetura, timeline, riscos, deploy
    │   ├── data-model.md         ← entidades, relacionamentos, schema Prisma
    │   ├── contracts/api.md      ← contrato da REST API
    │   ├── tasks.md              ← 34 tarefas (112 SP) + divisão em 3 sprints com testáveis
    │   ├── ui/screens.md         ← wireframes das telas
    │   ├── ui/design.md          ← design system (cores, tipografia, componentes)
    │   └── exports/              ← PDFs exportados (SPEC.pdf, SCREENS.pdf)
    └── 002-login-perfis/         ← feature 002: login, perfis de acesso e gestão de usuários
        ├── spec.md               ← problema, papéis, matriz de permissões, regras, critérios
        ├── plan.md               ← abordagem, contrato da API, análise de impacto, TDD
        ├── tasks.md              ← 18 tarefas em 5 sprints
        └── qa-test-plan.md       ← ambiente, massa de dados e casos de teste do QA
```

## Features

| Nº | Feature | Spec | Plano | Tarefas | Status |
|----|---------|------|-------|---------|--------|
| 001 | CRM de alunos (MVP) | [[001-crm-alunos/spec\|spec]] | [[001-crm-alunos/plan\|plan]] | [[001-crm-alunos/tasks\|tasks]] | Especificada |
| 002 | Login e perfis de acesso | [[002-login-perfis/spec\|spec]] | [[002-login-perfis/plan\|plan]] | [[002-login-perfis/tasks\|tasks]] | Planejada — aguardando aprovação |

Apoio da 001: [[data-model]] · [[api|contracts/api]] · [[screens|ui/screens]] · [[design|ui/design]]
Apoio da 002: [[qa-test-plan]]

## Fluxo do Spec Kit

| Etapa | Artefato | Pergunta que responde |
|-------|----------|----------------------|
| 1. Constitution | [[constitution]] | Quais regras não se negociam? |
| 2. Specify | `spec.md` da feature | O quê e por quê? |
| 3. Plan | `plan.md` (+ `data-model.md`, `contracts/`) | Como, tecnicamente? |
| 4. Tasks | `tasks.md` | Em que ordem se executa? |
| 5. Implement | código em `src/` e `api/` | — |

## Novas features

Use o comando `/nova-implementacao`: ele entrevista, cria a próxima pasta numerada
(`specs/NNN-nome-curto/`) **dentro deste vault** com `spec.md`, `plan.md`, `tasks.md` e
`qa-test-plan.md`, pede aprovação e só então implementa. A constitution não se duplica —
todas as features a seguem.

## Convenções deste vault

- Links internos em **wikilink** (`[[nota]]`), não em caminho relativo — assim o Obsidian
  acompanha renomeações e o grafo fica útil.
- Uma feature por pasta numerada em `specs/`; nada de documentação fora dessa estrutura.
- O código continua no repositório (`src/`, `api/`, `prisma/`, `tests/`); aqui só documentação.

## Decisões em aberto

Cada feature registra as suas no fim do próprio `spec.md`; as do projeto como um todo ficam no
`CLAUDE.md`, na raiz do repositório.
