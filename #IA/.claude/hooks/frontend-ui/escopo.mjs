#!/usr/bin/env node
// PreToolUse — frontend-ui só mexe em src/ e tests/src/, e não toca em backend, banco nem Git.
import { preEscopo } from '../lib/implementacao.mjs';

await preEscopo({
  agent: 'frontend-ui',
  pastas: ['src/', 'tests/src/'],
  descricaoEscopo: '`src/**` e `tests/src/**`',
  proibidos: [
    { re: /\bprisma\b|\bnpm\s+run\s+db:/, motivo: 'o frontend não fala com o banco — os dados vêm da API por src/services/' },
    { re: /\bpsql\b|\bdocker\b/, motivo: 'infraestrutura de banco não é domínio do frontend' },
    { re: /\bnext\s+(dev|build)\b(?!.*--turbopack)/, motivo: 'o caminho do projeto tem `#` e o webpack quebra — rodar o Next sempre com --turbopack' },
  ],
});
