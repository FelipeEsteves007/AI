#!/usr/bin/env node
// PostToolUse — roda a suíte `web` do Jest após cada edição no frontend.
import { postTestes } from '../lib/implementacao.mjs';

await postTestes({
  agent: 'frontend-ui',
  pastas: ['src/', 'tests/src/'],
  comando: ['npx', 'jest', '--selectProjects', 'web', '--silent'],
  rotulo: 'jest (projeto web)',
});
