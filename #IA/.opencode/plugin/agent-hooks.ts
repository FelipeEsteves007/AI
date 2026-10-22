/**
 * agent-hooks — hooks por agent do CRM de Alunos (OpenCode).
 *
 * Equivalente ao que os hooks do Claude Code fazem em `.claude/hooks/`:
 * cada agent só age dentro do seu domínio. Aqui tudo vive num plugin só, e o
 * nome do agent é verificado em cada hook.
 *
 * Convenção: lançar um Error em `tool.execute.before` aborta a chamada da
 * ferramenta e a mensagem volta para o agent (equivale ao `exit 2` do Claude Code).
 */

import type { Plugin } from '@opencode-ai/plugin';

type Regra = { re: RegExp; motivo: string };

const FERRAMENTAS_EDICAO = new Set(['write', 'edit', 'patch', 'multiedit']);
const FERRAMENTAS_SHELL = new Set(['bash', 'shell', 'powershell']);

/** Comandos proibidos para todo agent de implementação. */
const PROIBIDO_GERAL: Regra[] = [
  { re: /\bgit\s+(push|commit|reset\s+--hard|clean\s+-[a-z]*f)/, motivo: 'operação de Git que publica código ou altera histórico — quem commita é o desenvolvedor' },
  { re: /\bnpm\s+publish\b|\bvercel\s+(deploy|--prod)\b/, motivo: 'publicação/deploy não é tarefa de agent' },
  { re: /\brm\s+-[a-z]*[rf]|Remove-Item\b.*-Recurse/i, motivo: 'remoção recursiva de arquivos' },
  { re: /\bdocker\s+(rm|system\s+prune)\b/, motivo: 'os dados do Postgres são bind mount compartilhado com outros projetos' },
  { re: /\.env\.local\b(?!.*example)/, motivo: 'acesso ao `.env.local`, que contém segredos' },
];

/** Somente leitura: revisor/auditor. */
const LEITURA_PERMITIDA: RegExp[] = [
  /^npm\s+run\s+typecheck\b/,
  /^npm\s+(test|run\s+test:coverage)\b/,
  /^npx\s+jest\b(?!.*(-u|--updateSnapshot))/,
  /^npx\s+tsc\s+--noEmit\b/,
  /^npx\s+prisma\s+validate\b/,
  /^git\s+(status|diff|log|show|ls-files)\b/,
  /^(cat|head|tail|ls|dir|find|grep|rg|wc|sed\s+-n|type)\b/,
];

/** Lista branca do agent de QA: só execução de teste. */
const TESTES_PERMITIDOS: RegExp[] = [
  /^npm\s+(test|run\s+test:coverage|run\s+e2e|run\s+typecheck)\b/,
  /^npx\s+jest\b/,
  /^npx\s+playwright\s+(test|install)\b/,
  /^npx\s+tsc\s+--noEmit\b/,
  /^(pytest|vitest|jest)\b/,
];

type Config = {
  pastas: string[];
  descricaoEscopo: string;
  proibidos: Regra[];
  testes?: { rotulo: string; comando: string };
};

const AGENTS: Record<string, Config> = {
  'backend-api': {
    pastas: ['server/', 'tests/server/'],
    descricaoEscopo: '`server/**` e `tests/server/**`',
    proibidos: [
      { re: /\bprisma\s+migrate\b|\bnpm\s+run\s+db:(migrate|push)\b/, motivo: 'migration é domínio do database-prisma' },
      { re: /\bpsql\b|\bdocker\s+exec\s+postgres\b/, motivo: 'acesso direto ao banco — use o Prisma Client pela camada de models' },
      { re: /\bnpx\s+playwright\b|\bnpm\s+run\s+e2e\b/, motivo: 'E2E é domínio do qa-testes' },
    ],
    testes: { rotulo: 'jest (projeto api)', comando: 'npx jest --selectProjects api --silent' },
  },
  'frontend-ui': {
    pastas: ['src/', 'tests/src/'],
    descricaoEscopo: '`src/**` e `tests/src/**`',
    proibidos: [
      { re: /\bprisma\b|\bnpm\s+run\s+db:/, motivo: 'o frontend não fala com o banco — os dados vêm da API por src/services/' },
      { re: /\bpsql\b|\bdocker\b/, motivo: 'infraestrutura de banco não é domínio do frontend' },
      { re: /\bnext\s+(dev|build)\b(?!.*--turbopack)/, motivo: 'o caminho do projeto tem `#` e o webpack quebra — sempre --turbopack' },
    ],
    testes: { rotulo: 'jest (projeto web)', comando: 'npx jest --selectProjects web --silent' },
  },
  'database-prisma': {
    pastas: ['prisma/', 'server/database/', 'server/models/', 'tests/server/models/'],
    descricaoEscopo: '`prisma/**`, `server/database/**`, `server/models/**` e os testes de models',
    proibidos: [
      { re: /\bprisma\s+migrate\s+reset\b/, motivo: 'apaga o banco inteiro — o volume tem os bancos CursoREST e TurboMobile' },
      { re: /\bdrop\s+(database|schema)\b/i, motivo: 'DROP de banco/schema' },
      { re: /\/opt\/databases\/pg\b/, motivo: 'diretório de dados do Postgres, com bancos de outros projetos' },
      { re: /\bdocker\s+(stop|restart)\s+postgres\b/, motivo: 'derruba o banco de outros projetos; docker start é permitido' },
    ],
    testes: { rotulo: 'npx prisma validate', comando: 'npx prisma validate' },
  },
};

const bloqueio = (agent: string, motivo: string, permitido?: string) =>
  new Error(
    `[hook ${agent}] AÇÃO BLOQUEADA\n\n${motivo}` +
      (permitido ? `\n\nPermitido neste agent: ${permitido}` : ''),
  );

const caminhoRelativo = (args: any, raiz: string) => {
  const arquivo: string = args?.filePath ?? args?.file_path ?? args?.path ?? '';
  if (!arquivo) return '';
  return arquivo.replace(/\\/g, '/').replace(raiz.replace(/\\/g, '/') + '/', '');
};

export const AgentHooks: Plugin = async ({ directory, $ }) => {
  return {
    'tool.execute.before': async ({ tool, agent }, output) => {
      const nome = String(agent ?? '');
      const ferramenta = String(tool ?? '').toLowerCase();
      const comando = String(output?.args?.command ?? '').replace(/\s+/g, ' ').trim();
      const alvo = caminhoRelativo(output?.args, directory);

      // --- Agent somente leitura (revisor/auditor) ---------------------
      if (nome === 'code-reviewer') {
        if (FERRAMENTAS_EDICAO.has(ferramenta)) {
          throw bloqueio(
            nome,
            `O code-reviewer não altera código — o produto dele é o relatório classificado em ` +
              `BLOQUEANTE / IMPORTANTE / SUGESTÃO.\nTentativa: ${ferramenta} em ${alvo || '(sem caminho)'}.\n` +
              `Quem corrige é o agent do módulo, depois que o desenvolvedor aprovar o achado.`,
            'read, grep, glob e comandos de leitura/verificação',
          );
        }
        if (FERRAMENTAS_SHELL.has(ferramenta) && !LEITURA_PERMITIDA.some((re) => re.test(comando))) {
          throw bloqueio(
            nome,
            `Comando de shell recusado: \`${comando}\`\nO revisor só executa leitura e verificação.`,
            'npm run typecheck · npm test · npm run test:coverage · git status/diff/log · cat/ls/grep',
          );
        }
        return;
      }

      // --- Agent de QA: lista branca de execução de teste ---------------
      if (nome === 'qa-testes') {
        if (FERRAMENTAS_EDICAO.has(ferramenta) && alvo && !alvo.startsWith('tests/')) {
          throw bloqueio(
            nome,
            `Edição fora de \`tests/\`: \`${alvo}\`\nO qa-testes escreve testes, não código de ` +
              `produção. Se o teste está certo e o código falha, o bug é do código.`,
            'tests/server/** · tests/src/** · tests/e2e/** · tests/setup/**',
          );
        }
        if (FERRAMENTAS_SHELL.has(ferramenta) && !TESTES_PERMITIDOS.some((re) => re.test(comando))) {
          throw bloqueio(
            nome,
            `Comando recusado: \`${comando}\`\nEste agent só executa suíte de teste.`,
            'npm test · npm run test:coverage · npm run e2e · npx jest · npx playwright test',
          );
        }
        return;
      }

      // --- Agents de implementação --------------------------------------
      const cfg = AGENTS[nome];
      if (!cfg) return;

      if (FERRAMENTAS_EDICAO.has(ferramenta) && alvo && !cfg.pastas.some((p) => alvo.startsWith(p))) {
        throw bloqueio(
          nome,
          `Edição fora do escopo do agent: \`${alvo}\`\nO ${nome} só escreve em ${cfg.descricaoEscopo}. ` +
            `Outro módulo pertence a outro agent — peça o despacho certo em vez de invadir a camada.`,
          cfg.pastas.map((p) => `${p}**`).join(' · '),
        );
      }

      if (FERRAMENTAS_SHELL.has(ferramenta)) {
        for (const { re, motivo } of [...PROIBIDO_GERAL, ...cfg.proibidos]) {
          if (re.test(comando)) {
            throw bloqueio(nome, `Comando fora do escopo do ${nome}: \`${comando}\`\nMotivo: ${motivo}.`);
          }
        }
      }
    },

    // Depois de cada edição, roda os testes do módulo do agent.
    'tool.execute.after': async ({ tool, agent }, output) => {
      const nome = String(agent ?? '');
      const cfg = AGENTS[nome];
      if (!cfg?.testes) return;
      if (!FERRAMENTAS_EDICAO.has(String(tool ?? '').toLowerCase())) return;

      const alvo = caminhoRelativo((output as any)?.args ?? {}, directory);
      if (alvo && !cfg.pastas.some((p) => alvo.startsWith(p))) return;

      const r = await $`${{ raw: cfg.testes.comando }}`.nothrow().quiet();
      if (r.exitCode !== 0) {
        const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-30).join('\n');
        output.output =
          `${output.output ?? ''}\n\n[hook ${nome}] ${cfg.testes.rotulo} FALHOU após editar ${alvo}\n` +
          `${saida}\n\nCorrija antes da próxima subtarefa. Não ajuste o teste para caber num código errado.`;
      }
    },

    // Antes de encerrar, o módulo precisa estar verde.
    event: async ({ event }) => {
      if (event.type !== 'session.idle') return;
      const nome = String((event.properties as any)?.agent ?? '');
      const cfg = AGENTS[nome];
      if (!cfg?.testes) return;

      const typecheck = await $`npm run typecheck`.nothrow().quiet();
      const testes = await $`${{ raw: cfg.testes.comando }}`.nothrow().quiet();
      if (typecheck.exitCode !== 0 || testes.exitCode !== 0) {
        throw new Error(
          `[hook ${nome}] Encerramento bloqueado: o módulo não está verde ` +
            `(typecheck=${typecheck.exitCode}, ${cfg.testes.rotulo}=${testes.exitCode}). ` +
            `Resolva antes de finalizar — nunca relate "pronto" com verificação vermelha.`,
        );
      }
    },
  };
};
