#!/usr/bin/env node
// Stop — não encerra com schema inválido ou testes de models vermelhos.
import { stopVerifica } from '../lib/implementacao.mjs';

await stopVerifica({
  agent: 'database-prisma',
  etapas: [
    { rotulo: 'npx prisma validate', comando: ['npx', 'prisma', 'validate'] },
    { rotulo: 'jest (projeto api)', comando: ['npx', 'jest', '--selectProjects', 'api', '--silent'] },
  ],
});
