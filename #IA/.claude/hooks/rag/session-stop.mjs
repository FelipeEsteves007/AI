#!/usr/bin/env node
// Stop — captura a síntese da sessão inteira, não de uma task isolada.
//
// Atenção: o evento Stop dispara ao fim de CADA resposta, não só ao fim da sessão. Por isso:
//   - o arquivo é um por sessão (slug = id da sessão): cada captura sobrescreve e reindexa a anterior
//   - há um intervalo mínimo entre capturas da mesma sessão, para não abrir um `claude -p` por turno
// Assíncrono, e desiste em silêncio se o próprio hook já reabriu o turno.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const INTERVALO_MIN = 15 * 60 * 1000;

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let input = {};
try { input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { /* segue com {} */ }

if (input.stop_hook_active || !input.transcript_path) process.exit(0);

const raiz = input.cwd ?? process.cwd();
const sessao = String(input.session_id ?? 'sem-id').slice(0, 8);
const slug = `sessao-${sessao}`;

// Trava de intervalo por sessão.
const marca = path.join(raiz, '.claude', 'knowledge', `.ultima-captura-${sessao}`);
try {
  if (Date.now() - fs.statSync(marca).mtimeMs < INTERVALO_MIN) process.exit(0);
} catch { /* primeira captura desta sessão */ }
try {
  fs.mkdirSync(path.dirname(marca), { recursive: true });
  fs.writeFileSync(marca, new Date().toISOString());
} catch { /* sem marca, captura mesmo assim */ }

const filho = spawn(
  process.execPath,
  [path.join(raiz, '.claude/hooks/rag/capturar.mjs'),
   '--agent', 'sessao', '--slug', slug,
   '--transcript', input.transcript_path, '--cwd', raiz],
  { detached: true, stdio: 'ignore', cwd: raiz, windowsHide: true },
);
filho.unref();

process.exit(0);
