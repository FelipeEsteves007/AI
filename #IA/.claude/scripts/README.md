# `.claude/scripts/` — RAG de aprendizados do projeto

Captura o que se aprende trabalhando no projeto e devolve esse conhecimento quando ele volta a
ser útil. Tudo local: SQLite + sqlite-vec para a busca, all-MiniLM-L6-v2 para os embeddings.

## Como funciona

```
 fim de um agent ──SubagentStop──┐
                                 ├─► capturar.mjs (2º plano) ─► summarize.ts ─► .claude/knowledge/*.md
 fim de resposta ──Stop──────────┘                              └─► embed.ts ─► .claude/rag.db

 novo prompt ──UserPromptSubmit──► search.ts ─► top-3 chunks injetados no contexto
```

| Momento | Hook | Arquivo | Bloqueia? |
|---------|------|---------|-----------|
| Agent termina uma task | `SubagentStop` | [`../hooks/rag/subagent-stop.mjs`](../hooks/rag/subagent-stop.mjs) | Não — dispara em 2º plano |
| Sessão (fim de resposta) | `Stop` | [`../hooks/rag/session-stop.mjs`](../hooks/rag/session-stop.mjs) | Não — 2º plano, no máx. 1 captura a cada 15 min por sessão |
| Prompt novo | `UserPromptSubmit` | [`../hooks/rag/user-prompt-submit.mjs`](../hooks/rag/user-prompt-submit.mjs) | Teto de 8 s; falha em silêncio |

Registrados em [`../settings.json`](../settings.json).

## Arquivos

| Arquivo | Papel |
|---------|-------|
| [`lib/db.ts`](lib/db.ts) | Schema: `knowledge` (`id`, `path`, `content`, `embedding`, `category`, `agent`, `created_at`) + tabela virtual `knowledge_vec` (vec0, `float[384]`) |
| [`lib/embedding.ts`](lib/embedding.ts) | all-MiniLM-L6-v2 via `@xenova/transformers`; chunks de 200-300 tokens |
| [`summarize.ts`](summarize.ts) | Transcript → 4 categorias (`bugs`, `arquitetura`, `padrao`, `falha`) via `claude -p` → `.claude/knowledge/YYYY-MM-DD-<agent>-<slug>.md` |
| [`embed.ts`](embed.ts) | `.md` → chunks por categoria → embeddings → INSERT. Idempotente por `path` |
| [`search.ts`](search.ts) | Pergunta + agent → 15 vizinhos → reordena (categoria do agent +0,15/+0,07, mesmo agent +0,10) → top-3 |
| [`../hooks/rag/capturar.mjs`](../hooks/rag/capturar.mjs) | Encadeia summarize + embed; log em `.claude/knowledge/.captura.log` |

## Uso manual

```bash
npm run rag:search -- --agent backend-api "como filtrar alunos do vendedor na listagem?"
npm run rag:embed -- .claude/knowledge/2026-09-12-backend-api-task-207.md
npm run rag:reindex          # reindexa .claude/knowledge/ inteira
```

A base começa **vazia**. `rag.db` só nasce na primeira captura; até lá o `UserPromptSubmit`
não faz nada.

## Verificado em 2026-09-12

- `better-sqlite3` e `sqlite-vec` (v0.1.9) carregam no Windows, apesar do `#` no caminho
- embed → search de ponta a ponta: 3 chunks indexados e recuperados com a categoria certa no topo
- hook `UserPromptSubmit` injetando o bloco `<conhecimento-do-projeto>`
- captura completa a partir de um transcript: resumo com causa raiz e seção `falha` preenchida
- disparo em 2º plano funcionando no Claude Code real
- trava de intervalo do `Stop` barrando a segunda captura
- `npm run typecheck` verde e `jest` com 310 testes passando depois das mudanças

A base foi **esvaziada** depois dos testes — os dados eram de transcript inventado.

## Armadilhas (todas encontradas na prática)

- **Nunca passar argumento por `shell: true` no Windows.** Ele concatena sem escapar: o caminho do
  projeto (espaço + `#`) chegava partido ao meio. Os hooks chamam o `tsx` direto pelo Node.
- **O prompt do `claude -p` vai pelo stdin**, nunca como argumento. Picado pelo shell, o Claude
  recebia o transcript como pedido de trabalho e saía agindo no projeto.
- **O `claude -p` roda em `os.tmpdir()`, fora do projeto.** Dentro dele, a sessão headless carrega
  este `settings.json` e dispara o próprio `Stop` — laço de captura. Aconteceu duas vezes antes
  da correção.
- **Resposta do resumidor fora do formato é descartada**, não salva: sem as 4 seções, cai no
  extrator heurístico, marcado `origem: heuristica`.
- **sqlite-vec só aceita `rowid` como BigInt.** `Number` dá "Only integers are allowed for primary
  key values".
- **`Stop` dispara ao fim de toda resposta**, não ao fim da sessão. Se quiser só no encerramento de
  verdade, trocar por `SessionEnd` no `settings.json`.

## Pendências

- [ ] **Sem testes automatizados.** `.claude/scripts/` está fora do Jest e da cobertura de 70%
- [ ] **Segredos no transcript:** o summarize não filtra `.env.local` nem dados de aluno antes de
      gravar em `.claude/knowledge/`, que é versionado. Resolver antes de usar com dados reais
- [ ] **Custo:** cada captura é uma chamada ao Claude. Medir após alguns dias de uso
- [ ] **Agent ativo no `UserPromptSubmit`:** o hook roda na sessão principal e assume
      `orquestrador`; a priorização por agent só atua de fato na busca manual com `--agent`
