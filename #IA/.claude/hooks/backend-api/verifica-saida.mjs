#!/usr/bin/env node
// Stop — não encerra com typecheck ou testes do backend vermelhos.
import { stopVerifica } from '../lib/implementacao.mjs';

await stopVerifica({
  agent: 'backend-api',
  etapas: [
    { rotulo: 'npm run typecheck', comando: ['npm', 'run', 'typecheck'] },
    { rotulo: 'jest (projeto api)', comando: ['npx', 'jest', '--selectProjects', 'api', '--silent'] },
  ],
});
