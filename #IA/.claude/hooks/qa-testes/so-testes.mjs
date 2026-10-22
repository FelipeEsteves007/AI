#!/usr/bin/env node
// PreToolUse — qa-testes só executa comandos de teste e só escreve dentro de tests/.
import { readHookInput, deny, allow, targetPath, commandOf, EDIT_TOOLS, SHELL_TOOLS } from '../lib/hook.mjs';

const AGENT = 'qa-testes';

// Lista branca: exclusivamente execução de teste, cobertura e typecheck.
const TESTES_PERMITIDOS = [
  /^npm\s+(test|run\s+test:coverage|run\s+e2e|run\s+typecheck)\b/,
  /^npx\s+jest\b/,
  /^npx\s+playwright\s+(test|install)\b/,
  /^npx\s+tsc\s+--noEmit\b/,
  /^npx\s+vitest\b/,
  /^(pytest|vitest|jest)\b/,
];

const input = await readHookInput();
const tool = input.tool_name;

if (EDIT_TOOLS.has(tool)) {
  const alvo = targetPath(input);
  if (alvo && !alvo.startsWith('tests/')) {
    deny(
      AGENT,
      `Edição fora de \`tests/\`: \`${alvo}\`\n` +
        `O qa-testes escreve testes, não código de produção. Se o teste está certo e o código ` +
        `falha, o bug é do código: reporte ao orquestrador para o agent do módulo corrigir — ` +
        `nunca ajuste o teste para caber num código errado.`,
      'tests/server/** · tests/src/** · tests/e2e/** · tests/setup/**',
    );
  }
}

if (SHELL_TOOLS.has(tool)) {
  const cmd = commandOf(input);
  if (!TESTES_PERMITIDOS.some((re) => re.test(cmd))) {
    deny(
      AGENT,
      `Comando recusado: \`${cmd}\`\n` +
        `Este agent só executa suíte de teste. Nada de Git, build, deploy, banco, instalação de ` +
        `dependência ou manipulação de arquivo por shell.`,
      'npm test · npm run test:coverage · npm run e2e · npm run typecheck · ' +
        'npx jest · npx playwright test · npx tsc --noEmit',
    );
  }
}

allow();
