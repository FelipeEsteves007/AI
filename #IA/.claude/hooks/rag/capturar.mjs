#!/usr/bin/env node
/**
 * capturar.mjs — resume um transcript e indexa o resultado. Roda SEMPRE em segundo plano,
 * lançado pelos hooks de encerramento; nunca no caminho crítico de quem está trabalhando.
 *
 * Uso (interno):
 *   node .claude/hooks/rag/capturar.mjs --agent backend-api --slug 1530 --transcript <arquivo>
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const pegar = (nome) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const agent = pegar('agent') ?? 'sessao';
const slug = pegar('slug') ?? String(Date.now());
const transcript = pegar('transcript');
const raiz = pegar('cwd') ?? process.cwd();

const log = (msg) => {
  try {
    const arquivo = path.join(raiz, '.claude', 'knowledge', '.captura.log');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.appendFileSync(arquivo, `${new Date().toISOString()} [${agent}/${slug}] ${msg}\n`);
  } catch {
    /* log é conveniência: nunca derruba a captura */
  }
};

// tsx chamado direto pelo Node, SEM shell: no Windows o `shell: true` concatena os argumentos
// sem escapar, e o caminho do projeto (com espaço e `#`) chegava partido ao meio.
const TSX = path.join(raiz, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const rodar = (args) =>
  execFileSync(process.execPath, [TSX, ...args], {
    cwd: raiz,
    encoding: 'utf8',
    timeout: 600_000,
    windowsHide: true,
  });

try {
  if (!transcript || !fs.existsSync(transcript)) {
    log(`transcript ausente (${transcript ?? '—'}) — nada a capturar`);
    process.exit(0);
  }

  const destino = rodar([
    '.claude/scripts/summarize.ts',
    '--agent', agent, '--slug', slug, '--transcript', transcript,
  ]).trim().split('\n').pop();

  if (!destino || !fs.existsSync(destino)) {
    log('summarize não produziu arquivo');
    process.exit(0);
  }
  log(`resumido em ${path.relative(raiz, destino)}`);

  const saida = rodar(['.claude/scripts/embed.ts', destino]).trim();
  log(saida || 'embed sem saída');
} catch (erro) {
  log(`FALHOU: ${erro?.message ?? erro}`);
  process.exit(0); // captura de conhecimento nunca vira erro para o desenvolvedor
}
