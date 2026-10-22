---
agent: sessao
slug: sessao-be3c5c5e
data: 2026-09-14
origem: claude
---

# Aprendizados — sessao · sessao-be3c5c5e · 2026-09-14
## bugs
- Exportação CSV falhando com valor "78" em vez do BOM (65279) → o texto do teste era lido sem considerar o BOM real gerado pela rota → ajustada a comparação/remoção do BOM no teste.
- CSV exportado sem os cursos do aluno → o fake/seed de teste não populava `purchases` no cenário de exportação → passou a incluir `purchases: seed.purchases ?? []` no setup do repositório em memória.
- 500 em produção logo após o primeiro deploy → variáveis `LOG_LEVEL`/`JWT_SECRET` enviadas via pipe no PowerShell 5.1 receberam um BOM no início do valor, e o Pino rejeitava o nível de log inválido na importação do módulo, derrubando a API → logger reescrito para normalizar (remover BOM/espaços) e cair em um nível padrão em vez de lançar; variáveis recriadas via Git Bash com `printf`.
- Vercel gerando uma função pública para cada arquivo dentro de `api/` (incluindo seeds e o `server.ts`) → a Vercel trata qualquer arquivo na pasta raiz `api/` como Vercel Function pública, sem opção de exclusão → pasta renomeada para `server/`, alias `@server/`, backend passou a ser servido por uma única rota catch-all do Next (`src/pages/api/[...path].ts`).
- Configs do Jest corrompidos após um script de rename automatizado → o script de substituição de texto em JS usava `$'` como padrão de replace, que em certas engines de substituição insere o restante da string casada, duplicando conteúdo → arquivos reescritos manualmente.
- Checkbox de tarefa parecendo não responder ao clique (achado pelo E2E) → o estado só atualizava após a resposta da API, criando atraso perceptível → toggle tornado otimista (atualiza a UI na hora) com reversão automática se a chamada falhar.
- Deploy automático via push para o GitHub saindo como BLOCKED na Vercel → no plano Hobby, a Vercel bloqueia deploy de repositório privado quando o e-mail do autor do commit não corresponde ao dono da conta conectada (commit assinado com e-mail de outra conta GitHub) → identificado, correção depende de decisão do usuário (trocar e-mail do commit, linkar conta ou tornar repo público).

## arquitetura
- API Express passou a ser servida dentro do mesmo projeto Next, por uma rota catch-all (`src/pages/api/[...path].ts`), em vez de dois projetos separados na Vercel — motivo: um domínio único evita CORS e mantém o cookie de sessão HttpOnly como first-party; em dev/E2E o proxy para a porta separada continua valendo via `API_URL`.
- Pasta do backend renomeada de `api/` para `server/` (e alias de `@api/` para `@server/` em todo o projeto, incluindo agents, hooks e CLAUDE.md) — motivo: convenção da Vercel de transformar qualquer arquivo em `api/` na raiz em função pública, o que vazava seeds e seria custoso/inseguro.
- Banco de produção via Neon, provisionado pelo Vercel Marketplace, no lugar do (descontinuado) Vercel Postgres — alternativa adotada por já estar integrada à cobrança/env vars da Vercel.
- Envio de e-mail para múltiplos alunos implementado como seleção manual na listagem (até 100 por envio), nunca automação — decisão para conciliar a funcionalidade pedida (UC-9) com a regra do CLAUDE.md que proíbe "automação de e-mail em massa".
- Exportação CSV restrita a admin e CEO, respeitando os filtros ativos da tela, com fluxo próprio via `fetch` direto (não pelo `apiClient` que só lê JSON), porque o resultado é um arquivo, não JSON.

## padrao
- Toda alteração aditiva ao contrato de repositórios de teste (ex.: novo `mailer`) exige atualizar em conjunto: tipo do agregador de repositórios, fake em memória, e os dois helpers de teste (`inMemoryRepositories.ts` e `routeTestKit.ts`) — os quatro pontos sempre andam juntos.
- Cada corretiva ou feature nova em `CLAUDE.md`/notas de sprint é registrada como decisão versionada (ex. "S9-1", "S9-4") com checkbox riscado (`~~item~~`), preservando o histórico da decisão em vez de apagar a linha.
- Verificação de fechamento de sprint segue sempre a mesma sequência: `tsc --noEmit` → testes unitários com cobertura → testes de integração → E2E → build de produção, antes de declarar "pronto".
- Segredos nunca são passados por pipe no PowerShell 5.1 para comandos que os consomem (ex. `vercel env add`) — usar Git Bash com `printf` para evitar corrupção por BOM.
- Documentação de progresso (handoff, report da feature, nota de sprint, Roadmap) é atualizada na mesma sessão em que uma tarefa muda de estado, não deixada para depois.
- Scripts de rename/refactor em massa (ex. api→server) rodam via script Node dedicado no scratchpad, seguido de checagem por grep dos padrões residuais (`@api/`, caminhos antigos) antes de comitar.

## falha
- `gh api -X PUT .../branches/main/protection` para proteger a branch `main` falhou (HTTP 403) porque o GitHub só permite proteção de branch em repositório privado no plano Pro — não há workaround no plano gratuito além de tornar o repo público ou assinar o Pro.
- `git grep` com pathspecs de exclusão (`':!api/'` etc.) falhou com "fatal: unable to resolve revision" ao tentar excluir um caminho chamado `api` — nome de pathspec conflitou com sintaxe/parsing do comando; foi necessário usar Grep com glob em vez de `git grep` com múltiplos excludes.
- Comando composto com `Start-Sleep 45` seguido de outro comando foi bloqueado pelo harness (padrão de espera não permitido) — instrução era usar Monitor com loop `until` (bash) ou `run_in_background`, não encadear sleeps.
- Rodar `vercel integration add neon --help` (e comandos `vercel` em geral) via PowerShell produzia ruído de erro (`node.exe : <claude-code-hint.../>`) tratado como falha de comando mesmo quando a operação teve sucesso — texto de hint do plugin sendo interpretado como stderr pelo PowerShell 5.1, exigindo filtrar essas linhas nos pipelines subsequentes.
- Query SQL original para checar o locale do banco (`SELECT current_setting('lc_ctype')...`) não funcionou como esperado no Neon — precisou trocar para `SELECT d.datctype ... FROM pg_database d WHERE d.datname = current_database()`.
