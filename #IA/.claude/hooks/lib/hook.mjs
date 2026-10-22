// Utilitários compartilhados pelos hooks de agent do CRM de Alunos.
//
// Contrato do Claude Code:
//   - o hook recebe um JSON no stdin (hook_event_name, tool_name, tool_input, cwd, …)
//   - exit 0  → permite
//   - exit 2  → bloqueia; o stderr volta para o agent como mensagem
//
// Escritos em Node (e não em .sh) de propósito: o projeto já exige Node 20+ e o caminho
// contém `#`, que quebra em vários shells no Windows.

import { execFileSync } from 'node:child_process';
import path from 'node:path';

export async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Bloqueia a ação e explica o porquê ao agent. */
export function deny(agent, motivo, permitido) {
  const linhas = [`[hook ${agent}] AÇÃO BLOQUEADA`, '', motivo];
  if (permitido) linhas.push('', `Permitido neste agent: ${permitido}`);
  process.stderr.write(linhas.join('\n') + '\n');
  process.exit(2);
}

export function allow() {
  process.exit(0);
}

/** Caminho do arquivo alvo de Write/Edit/NotebookEdit, relativo à raiz, com `/`. */
export function targetPath(input) {
  const file = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (!file) return null;
  const root = input?.cwd ?? process.cwd();
  const rel = path.isAbsolute(file) ? path.relative(root, file) : file;
  return rel.split(path.sep).join('/');
}

/** Comando de um Bash/PowerShell, normalizado numa linha só. */
export function commandOf(input) {
  return String(input?.tool_input?.command ?? '').replace(/\s+/g, ' ').trim();
}

export const EDIT_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'MultiEdit']);
export const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

/** Comandos proibidos para todo agent de implementação. */
export const PROIBIDO_GERAL = [
  { re: /\bgit\s+(push|commit|reset\s+--hard|clean\s+-[a-z]*f)/, motivo: 'operação de Git que altera histórico ou publica código — só o desenvolvedor decide commitar e dar push' },
  { re: /\bnpm\s+publish\b|\bvercel\s+(deploy|--prod)\b/, motivo: 'publicação/deploy não é tarefa de agent' },
  { re: /\brm\s+-[a-z]*[rf]|Remove-Item\b.*-Recurse/i, motivo: 'remoção recursiva de arquivos' },
  { re: /\bdocker\s+(rm|system\s+prune)\b/, motivo: 'remoção de container/volume — os dados do Postgres são bind mount compartilhado com outros projetos' },
  { re: /\.env\.local\b(?!.*example)/, motivo: 'acesso ao `.env.local`, que contém segredos' },
];

/** Roda um comando na raiz do projeto e devolve {ok, saida}. */
export function run(cmd, args, cwd) {
  try {
    const saida = execFileSync(cmd, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      timeout: 300000,
    });
    return { ok: true, saida };
  } catch (erro) {
    return { ok: false, saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}` || String(erro.message) };
  }
}

/** Últimas N linhas úteis de uma saída de teste. */
export function cauda(texto, n = 30) {
  return texto.split('\n').filter((l) => l.trim()).slice(-n).join('\n');
}
