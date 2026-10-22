#!/usr/bin/env node
// SubagentStop — captura o aprendizado do agent que acabou de terminar uma task.
// Assíncrono: dispara a captura em segundo plano e devolve o controle na hora.
//
// Campos do Claude Code (conferidos gravando o JSON real do evento):
//   agent_type            → nome do agent (ex.: "backend-api")
//   agent_id              → id único desta execução
//   agent_transcript_path → transcript SÓ do agent
//   transcript_path       → transcript da sessão-mãe inteira — NÃO usar aqui: resumia a
//                           sessão toda com o rótulo do agent e duplicava a captura do Stop
import { spawn } from 'node:child_process';
import path from 'node:path';

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let input = {};
try { input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { /* segue com {} */ }

const raiz = input.cwd ?? process.cwd();
const agent = input.agent_type ?? 'subagent';
const transcript = input.agent_transcript_path;
const slug = `task-${String(input.agent_id ?? Date.now()).slice(0, 8)}`;

// Sem o transcript próprio do agent, não captura: cair no da sessão reintroduziria o bug.
if (transcript) {
  const filho = spawn(
    process.execPath,
    [path.join(raiz, '.claude/hooks/rag/capturar.mjs'),
     '--agent', String(agent), '--slug', slug,
     '--transcript', transcript, '--cwd', raiz],
    { detached: true, stdio: 'ignore', cwd: raiz, windowsHide: true },
  );
  filho.unref();
}

process.exit(0);
