#!/usr/bin/env node
// PreToolUse — backend-api só mexe em server/ e tests/server/, e não invade banco, Git nem frontend.
import { preEscopo } from '../lib/implementacao.mjs';

await preEscopo({
  agent: 'backend-api',
  pastas: ['server/', 'tests/server/'],
  descricaoEscopo: '`server/**` e `tests/server/**`',
  proibidos: [
    { re: /\bprisma\s+migrate\b|\bnpm\s+run\s+db:(migrate|push)\b/, motivo: 'migration é domínio do agent database-prisma' },
    { re: /\bpsql\b|\bdocker\s+exec\s+postgres\b/, motivo: 'acesso direto ao banco — use o Prisma Client pela camada de models' },
    { re: /\bnpm\s+run\s+(dev|build)\b(?!:api)/, motivo: 'build/dev do frontend não é do backend' },
    { re: /\bnpx\s+playwright\b|\bnpm\s+run\s+e2e\b/, motivo: 'E2E é domínio do agent qa-testes' },
  ],
});
