#!/usr/bin/env node
// UserPromptSubmit — busca conhecimento relevante e injeta no contexto.
// Este é o único hook do RAG que roda no caminho crítico: tem teto de tempo e falha em silêncio.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TETO_MS = 8000;

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let input = {};
try { input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { /* segue com {} */ }

const raiz = input.cwd ?? process.cwd();
const prompt = String(input.prompt ?? '').trim();

// Sem prompt, sem base ou sem dependências instaladas: não atrapalha ninguém.
if (!prompt || prompt.length < 12) process.exit(0);
if (!fs.existsSync(path.join(raiz, '.claude', 'rag.db'))) process.exit(0);

// Agent ativo: o hook roda na sessão principal, então o padrão é o orquestrador.
const agent = input.agent_name ?? input.subagent_type ?? 'orquestrador';

try {
  // tsx direto pelo Node, sem shell — o caminho do projeto tem espaço e `#`.
  const tsx = path.join(raiz, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const saida = execFileSync(process.execPath, [tsx, '.claude/scripts/search.ts', '--agent', String(agent)], {
    cwd: raiz,
    input: prompt,
    encoding: 'utf8',
    timeout: TETO_MS,
    windowsHide: true,
  }).trim();

  if (saida) process.stdout.write(saida + '\n'); // stdout do UserPromptSubmit entra no contexto
} catch {
  /* busca é conveniência: nunca bloqueia o prompt */
}

process.exit(0);
