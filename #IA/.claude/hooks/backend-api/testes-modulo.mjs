#!/usr/bin/env node
// PostToolUse — roda a suíte `api` do Jest após cada edição no backend.
import { postTestes } from '../lib/implementacao.mjs';

await postTestes({
  agent: 'backend-api',
  pastas: ['server/', 'tests/server/'],
  comando: ['npx', 'jest', '--selectProjects', 'api', '--silent'],
  rotulo: 'jest (projeto api)',
});
