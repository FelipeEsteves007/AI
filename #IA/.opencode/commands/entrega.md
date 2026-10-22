---
description: Roda a verificação de encerramento, confere os checkboxes das tasks, gera o relatório de próximos passos e confirma que o projeto está pronto para outra pessoa clonar
agent: build
argument-hint: "[feature — ex.: 002 (opcional; vazio = projeto inteiro)]"
---

# /entrega

Escopo: **$ARGUMENTS** (vazio = projeto inteiro).

Este comando **não implementa nada**. Ele audita, verifica e relata. Qualquer correção é
proposta ao desenvolvedor, nunca aplicada em silêncio.


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
## Fase 1 — Hooks de encerramento

1. Leia `.claude/settings.json` e `.claude/settings.local.json`, se existirem, e execute o que
   estiver configurado como hook de encerramento (`Stop`, `SessionEnd`, `PostToolUse`).
2. **Hoje o projeto não tem `settings.json` nem hooks configurados.** Nesse caso, o
   encerramento é a pipeline de verificação do `CLAUDE.md` — rode na ordem e **cole a saída
   real de cada comando**:

```
npm run typecheck
npm test
npm run test:coverage
npm run e2e
npm run build
```

3. Monte o quadro de resultado. Nunca marque ✅ sem ter visto a saída:

| Etapa | Resultado |
|---|---|
| typecheck | ✅/❌ + resumo |
| test | ✅/❌ + nº de testes |
| coverage | % (mínimo 70) |
| e2e | ✅/❌ |
| build | ✅/❌ |

Se o e2e exigir servidor no ar ou o banco estiver fora, **diga que não rodou e por quê** — não
declare sucesso por omissão. O Postgres é um container Docker no WSL `Ubuntu` e pode estar
parado (`wsl -d Ubuntu -e bash -lc 'docker start postgres'` — ver `ImersaoIA/handoff.md`).

## Fase 2 — Conferir os checkboxes das tasks

> O plano de tarefas vive em `ImersaoIA/specs/<NNN-feature>/tasks.md`, não num `PLAN.md` na raiz.

Para cada feature no escopo:

1. Liste as tasks e o estado dos checkboxes (concluídas × pendentes, por sprint/módulo).
2. **Audite os marcados**: para uma amostra das tasks marcadas como concluídas, confirme no
   código e nos testes que a entrega existe de fato. Checkbox marcado sem código ou sem teste
   correspondente é uma **divergência** e deve ser reportada.
3. Reporte também o inverso: código entregue com a task ainda desmarcada.

Quadro por feature:

| Feature | Concluídas | Pendentes | Divergências |
|---|---|---|---|

## Fase 3 — Prontidão para clonar

Simule o que outra pessoa encontra ao clonar o repositório e confira, item a item:

- [ ] `README` ou `CLAUDE.md` explicam o que é o projeto e como rodar
- [ ] `.env.example` existe, está completo e **sem segredo real**
- [ ] `.env.local` está no `.gitignore` e **não** está versionado
- [ ] Nenhum segredo (senha, token, `JWT_SECRET`) em código, teste ou doc
- [ ] `npm install` basta — dependências todas declaradas no `package.json`
- [ ] Scripts de `package.json` do `CLAUDE.md` existem e funcionam
- [ ] Migrations em `prisma/migrations/` e seed disponível para um banco vazio
- [ ] `ImersaoIA/handoff.md` atualizado: onde paramos, próximo passo, armadilhas
- [ ] Pré-requisitos externos documentados (Node 20+, PostgreSQL, o container no WSL)
- [ ] Nenhum caminho absoluto da máquina do Adriano hardcoded no código
- [ ] Sem `console.log` sobrando (o `CLAUDE.md` proíbe em produção)
- [ ] Estado do Git declarado — **hoje o diretório não é um repositório Git**: reporte isso
      como bloqueante de "pronto para clonar" e ofereça `git init`

Verifique com grep/leitura de arquivo, não de memória. Cada item reprovado vira linha do
relatório com o arquivo que o comprova.

## Fase 4 — Relatório de próximos passos

```
# Relatório de entrega — <escopo> — <data>

## 1. Verificação
<quadro da Fase 1, com a saída real>

## 2. Tasks
<quadro da Fase 2 + divergências encontradas>

## 3. Prontidão para clonar
<checklist da Fase 3, com ✅/❌ e a evidência de cada ❌>

## 4. Próximos passos
### 🔴 Bloqueia a entrega
1. <o quê> — por quê — como resolver — arquivo
### 🟡 Deve ser feito em seguida
### 🟢 Quando sobrar tempo

## 5. Decisões em aberto ainda pendentes
<as do CLAUDE.md que travam código — validação (Zod/Joi), logging (Pino/Winston), caixa de arquivos>

## 6. Veredito
PRONTO PARA ENTREGA | PRONTO COM RESSALVAS | NÃO PRONTO — <uma frase de justificativa>
```

O veredito é **NÃO PRONTO** se qualquer comando de verificação falhou, se a cobertura está
abaixo de 70%, se há divergência entre checkbox e código, ou se algum item de segurança da
Fase 3 reprovou.

## Fase 5 — Handoff

Ao final, pergunte **uma vez** se o desenvolvedor quer atualizar `ImersaoIA/handoff.md` com o estado
desta entrega (onde paramos, decisões, pendências, próximo passo concreto). Se sim, atualize
**esse mesmo arquivo** — nunca crie um handoff por sessão.
