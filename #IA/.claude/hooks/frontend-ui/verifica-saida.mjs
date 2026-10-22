#!/usr/bin/env node
// Stop — não encerra com typecheck ou testes de tela vermelhos.
import { stopVerifica } from '../lib/implementacao.mjs';

await stopVerifica({
  agent: 'frontend-ui',
  etapas: [
    { rotulo: 'npm run typecheck', comando: ['npm', 'run', 'typecheck'] },
    { rotulo: 'jest (projeto web)', comando: ['npx', 'jest', '--selectProjects', 'web', '--silent'] },
  ],
});
