#!/usr/bin/env node
// PreToolUse — code-reviewer é SOMENTE LEITURA.
// Bloqueia Write/Edit e qualquer comando de shell que não seja leitura ou verificação.
import { readHookInput, deny, allow, commandOf, EDIT_TOOLS, SHELL_TOOLS } from '../lib/hook.mjs';

const AGENT = 'code-reviewer';

// Só estes comandos passam: leitura de código e verificação que não altera nada.
const LEITURA_PERMITIDA = [
  /^npm\s+run\s+typecheck\b/,
  /^npm\s+(test|run\s+test:coverage)\b/,
  /^npx\s+jest\b(?!.*(-u|--updateSnapshot))/,
  /^npx\s+tsc\s+--noEmit\b/,
  /^npx\s+prisma\s+validate\b/,
  /^git\s+(status|diff|log|show|ls-files)\b/,
  /^(cat|head|tail|ls|dir|find|grep|rg|wc|sed\s+-n|type)\b/,
  /^(Get-Content|Get-ChildItem|Select-String|Measure-Object)\b/,
];

const input = await readHookInput();
const tool = input.tool_name;

if (EDIT_TOOLS.has(tool)) {
  deny(
    AGENT,
    `O code-reviewer não altera código. Ele foi chamado para revisar, e o produto dele é o ` +
      `relatório classificado em BLOQUEANTE / IMPORTANTE / SUGESTÃO.\n` +
      `Tentativa bloqueada: ${tool} em ${input.tool_input?.file_path ?? '(sem caminho)'}.\n` +
      `Quem corrige é o agent do módulo (backend-api, frontend-ui, database-prisma, qa-testes), ` +
      `depois que o desenvolvedor aprovar o achado.`,
    'Read, Grep, Glob e comandos de leitura/verificação.',
  );
}

if (SHELL_TOOLS.has(tool)) {
  const cmd = commandOf(input);
  if (!LEITURA_PERMITIDA.some((re) => re.test(cmd))) {
    deny(
      AGENT,
      `Comando de shell recusado: \`${cmd}\`\n` +
        `O code-reviewer só executa leitura e verificação — nada que altere arquivos, banco, ` +
        `dependências ou Git.`,
      'npm run typecheck · npm test · npm run test:coverage · npx tsc --noEmit · ' +
        'npx prisma validate · git status/diff/log · cat/ls/grep/find',
    );
  }
}

allow();
