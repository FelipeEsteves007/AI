#!/usr/bin/env node
// PostToolUse — valida o schema Prisma após cada edição.
import { postTestes } from '../lib/implementacao.mjs';

await postTestes({
  agent: 'database-prisma',
  pastas: ['prisma/'],
  comando: ['npx', 'prisma', 'validate'],
  rotulo: 'npx prisma validate',
});
