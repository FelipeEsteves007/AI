---
sprint: 4
status: concluída
origem: 002 TASK-212 a 215
---

# Sprint 4 — Frontend de acesso

> Detalhe de cada tarefa em [[002-login-perfis/tasks|tasks da 002]]. Voltar para o [[Roadmap]].

## Objetivo

Primeira vez que dá para usar o sistema pelo navegador: entrar, ser obrigado a trocar a senha
provisória, ver um menu que respeita o seu papel e — se for admin — gerenciar usuários.

Substitui as TASK-005, 006, 029 (parte) e 030 da feature 001.

## Pré-requisito

[[sprint-3-usuarios-api|Sprint 3]] fechada e `npm run db:seed-admin` rodado — sem o primeiro admin
não há como testar nada disso.

## Tarefas

| ID | Tarefa | Depende de |
|----|--------|------------|
| TASK-212 | Proxy do Next, cliente HTTP e `AuthContext` | TASK-208 |
| TASK-213 | `AuthGuard`, tela de login e troca de senha | TASK-212 |
| TASK-214 | Layout com menu por permissão | TASK-212 |
| TASK-215 | Tela de usuários (só admin) | TASK-210, 213 |

## Ordem sugerida

212 primeiro — é a fundação das outras três. Depois **213 e 214 em paralelo** (não se tocam), e a
215 por último, porque depende da 213.

## Decisões de arquitetura que se materializam aqui

- **Mesmo domínio, sem CORS**: o Next faz `rewrites` de `/api/*` para `API_URL`. O navegador só
  fala com o domínio do Next, então o cookie HttpOnly é de primeira parte.
- **`AuthContext` chama `GET /api/auth/me`** ao abrir o app e guarda usuário + permissões.
- **A proteção real continua sendo o 401/403 do backend.** O `AuthGuard` e o menu por permissão
  são conveniência de navegação, não segurança.

## Definição de pronto

- [x] Sem sessão, qualquer página privada manda para `/login`
- [x] Com senha provisória, qualquer página manda para `/change-password` — e não dá para escapar
- [x] Login com credencial errada mostra **mensagem genérica** (não revela se o e-mail existe)
- [x] Aviso claro quando a conta está bloqueada por tentativas
- [x] Troca de senha valida mínimo 6 e confirmação igual, e mostra os erros da API
- [x] Item "Usuários" no menu **só** aparece com `users:manage`
- [x] Layout mostra o nome do usuário e o "Sair" faz logout de verdade
- [x] Admin lista, cria, troca papel, desativa/reativa e redefine senha pela tela
- [x] A senha provisória aparece **uma vez**, com aviso de que não será mostrada de novo
- [x] Erro de e-mail em uso aparece no formulário, não como erro genérico
- [x] Fluxo completo no navegador com a API rodando
- [x] `npm run typecheck && npm test && npm run test:coverage` verde

## Riscos e armadilhas

- **Nunca guardar o token no frontend.** O backend define o cookie; o front não vê nem toca nele.
  Regra do `CLAUDE.md`.
- **Esconder o menu não é RBAC.** Se alguém digitar `/settings/users` na barra de endereço, quem
  barra é o 403 da API. Testar isso, não só o menu.
- **A senha provisória some depois de mostrada** — se o admin fechar o modal sem copiar, o caminho
  é redefinir a senha, não procurar no banco.
- **`--turbopack` sempre**: o caminho do projeto tem `#` e o webpack quebra com 500.

## Entrega

Fluxo de acesso completo e usável no navegador.

Próxima: [[sprint-5-e2e-fechamento-002|Sprint 5 — E2E e fechamento da 002]].

## Resultado (2026-09-12)

Sprint 4 concluída por TDD. Estado ao fim da feature 002: 310 testes unitários, 16 E2E, cobertura 92,92%.
Detalhe por tarefa em [[002-login-perfis/report|report da 002]].
