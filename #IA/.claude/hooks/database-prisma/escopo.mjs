#!/usr/bin/env node
// PreToolUse — database-prisma só mexe no schema, nas migrations e nos seeds, e nunca destrói dados.
import { preEscopo } from '../lib/implementacao.mjs';

await preEscopo({
  agent: 'database-prisma',
  pastas: ['prisma/', 'server/database/', 'server/models/', 'tests/server/models/'],
  descricaoEscopo: '`prisma/**`, `server/database/**`, `server/models/**` e os testes de models',
  proibidos: [
    { re: /\bprisma\s+migrate\s+reset\b|\bmigrate\s+reset\b/, motivo: 'apaga o banco inteiro — o volume é compartilhado com os bancos CursoREST e TurboMobile' },
    { re: /\bdrop\s+(database|schema)\b/i, motivo: 'DROP de banco/schema' },
    { re: /\/opt\/databases\/pg\b/, motivo: 'é o diretório de dados do Postgres, com bancos de outros projetos' },
    { re: /\bdocker\s+(stop|restart)\s+postgres\b/, motivo: 'derrubar o container tira o banco de outros projetos do ar; subir (docker start) é permitido' },
  ],
});
