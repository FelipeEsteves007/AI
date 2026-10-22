// Lógica compartilhada pelos agents de implementação (backend-api, frontend-ui, database-prisma).
// Cada agent só configura o seu escopo de pastas, os comandos extras proibidos e como rodar
// os testes do seu módulo.

import { readHookInput, deny, allow, targetPath, commandOf, run, cauda, EDIT_TOOLS, SHELL_TOOLS, PROIBIDO_GERAL } from './hook.mjs';

/** PreToolUse: barra edição fora do escopo e comando fora do domínio do agent. */
export async function preEscopo({ agent, pastas, proibidos, descricaoEscopo }) {
  const input = await readHookInput();
  const tool = input.tool_name;

  if (EDIT_TOOLS.has(tool)) {
    const alvo = targetPath(input);
    if (alvo && !pastas.some((p) => alvo.startsWith(p))) {
      deny(
        agent,
        `Edição fora do escopo do agent: \`${alvo}\`\n` +
          `O ${agent} só escreve em ${descricaoEscopo}. Outro módulo pertence a outro agent — ` +
          `peça ao orquestrador (/implementar) para despachar o agent certo em vez de invadir a camada.`,
        pastas.map((p) => `${p}**`).join(' · '),
      );
    }
  }

  if (SHELL_TOOLS.has(tool)) {
    const cmd = commandOf(input);
    for (const { re, motivo } of [...PROIBIDO_GERAL, ...(proibidos ?? [])]) {
      if (re.test(cmd)) {
        deny(agent, `Comando fora do escopo do ${agent}: \`${cmd}\`\nMotivo: ${motivo}.`);
      }
    }
  }

  allow();
}

/** PostToolUse: roda os testes do módulo depois de cada edição. */
export async function postTestes({ agent, pastas, comando, rotulo }) {
  const input = await readHookInput();
  if (!EDIT_TOOLS.has(input.tool_name)) allow();

  const alvo = targetPath(input);
  if (alvo && !pastas.some((p) => alvo.startsWith(p))) allow();

  const raiz = input.cwd ?? process.cwd();
  const { ok, saida } = run(comando[0], comando.slice(1), raiz);
  if (!ok) {
    process.stderr.write(
      `[hook ${agent}] ${rotulo} FALHOU após editar ${alvo}\n\n${cauda(saida)}\n\n` +
        `Corrija antes de seguir para a próxima subtarefa. Se o teste está certo e o código falhou, ` +
        `o bug é do código — não ajuste o teste para caber nele.\n`,
    );
    process.exit(2);
  }
  allow();
}

/** Stop: não deixa encerrar com o módulo vermelho. */
export async function stopVerifica({ agent, etapas }) {
  const input = await readHookInput();
  if (input.stop_hook_active) allow(); // evita laço quando o próprio hook já reabriu o turno

  const raiz = input.cwd ?? process.cwd();
  const falhas = [];
  for (const { rotulo, comando } of etapas) {
    const { ok, saida } = run(comando[0], comando.slice(1), raiz);
    if (!ok) falhas.push(`### ${rotulo}\n${cauda(saida, 25)}`);
  }

  if (falhas.length) {
    process.stderr.write(
      `[hook ${agent}] Encerramento bloqueado: o módulo não está verde.\n\n` +
        falhas.join('\n\n') +
        `\n\nResolva e só então finalize. Nunca relate "pronto" com verificação vermelha.\n`,
    );
    process.exit(2);
  }
  allow();
}
