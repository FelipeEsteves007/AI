/**
 * summarize.ts — extrai os aprendizados de um contexto (transcript de agent ou de sessão inteira)
 * e salva em `.claude/knowledge/YYYY-MM-DD-<agent>-<slug>.md`.
 *
 * Uso:
 *   cat transcript.jsonl | npx tsx .claude/scripts/summarize.ts --agent backend-api --slug task-207
 *   npx tsx .claude/scripts/summarize.ts --agent sessao --transcript <caminho.jsonl>
 *
 * Quem faz a extração é o próprio Claude, em modo headless (`claude -p`), com um prompt fechado.
 * Sem a CLI disponível, cai num extrator heurístico que ao menos preserva os sinais objetivos
 * (comandos que falharam, arquivos tocados) — marcado no arquivo como `origem: heuristica`,
 * para ninguém confundir registro bruto com aprendizado destilado.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROMPT = `Você recebe o transcript de uma sessão de desenvolvimento do CRM de Alunos.
Extraia APENAS aprendizados reutilizáveis, em Markdown, exatamente nestas quatro seções
(mantenha os títulos como estão, mesmo que alguma fique vazia):

## bugs
Bugs resolvidos COM A CAUSA RAIZ. Formato: "sintoma → causa raiz → correção". Sem causa raiz
identificada, não escreva o item.

## arquitetura
Decisões de arquitetura e projeto tomadas, com o PORQUÊ e as alternativas descartadas.

## padrao
Padrões adotados que valem para o próximo trabalho: convenção de código, de teste, de nome,
de estrutura de pasta, de fluxo entre agents.

## falha
O que NÃO funcionou e por quê: caminho tentado e abandonado, comando que não serve aqui,
suposição que se mostrou errada. É a seção mais valiosa — não a deixe vazia por educação.

Regras:
- Um item por linha, começando com "- ".
- Escreva o fato, não a narrativa: nada de "o usuário pediu", "então eu fiz".
- Nada de conteúdo específico de uma única execução (ids, timestamps, caminhos temporários).
- Se não houver nada de verdade numa seção, escreva "- (nada nesta sessão)".
- Não invente. Só o que está no transcript.`;

const CATEGORIAS_ESPERADAS = ['bugs', 'arquitetura', 'padrao', 'falha'];

type Args = { agent: string; slug: string; transcript?: string };

function lerArgs(): Args {
  const argv = process.argv.slice(2);
  const pegar = (nome: string) => {
    const i = argv.indexOf(`--${nome}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    agent: pegar('agent') ?? 'sessao',
    slug: pegar('slug') ?? 'sessao',
    transcript: pegar('transcript'),
  };
}

function lerStdin(): string {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** Transcript do Claude Code é JSONL: reduz a texto legível e corta o que não ensina nada. */
export function normalizarTranscript(bruto: string): string {
  const linhas = bruto.split('\n').filter((l) => l.trim());
  const partes: string[] = [];

  for (const linha of linhas) {
    if (!linha.trimStart().startsWith('{')) {
      partes.push(linha);
      continue;
    }
    try {
      const ev = JSON.parse(linha);
      const conteudo = ev?.message?.content ?? ev?.content;
      if (typeof conteudo === 'string') partes.push(conteudo);
      else if (Array.isArray(conteudo)) {
        for (const bloco of conteudo) {
          if (bloco?.type === 'text' && bloco.text) partes.push(bloco.text);
          if (bloco?.type === 'tool_use') partes.push(`[ferramenta ${bloco.name}] ${JSON.stringify(bloco.input).slice(0, 500)}`);
          if (bloco?.type === 'tool_result' && bloco.is_error) partes.push(`[erro de ferramenta] ${String(bloco.content).slice(0, 500)}`);
        }
      }
    } catch {
      partes.push(linha);
    }
  }
  return partes.join('\n').slice(-120_000); // teto de contexto do resumidor
}

function extrairComClaude(contexto: string): string | null {
  // O prompt e o transcript vão pelo stdin, nunca como argumento: no Windows o `shell: true`
  // concatena argumentos sem escapar, e um prompt de várias linhas chegava picado — o Claude
  // recebia o transcript como pedido de trabalho e saía agindo no projeto.
  const entrada = `${PROMPT}

<transcript>
${contexto}
</transcript>`;
  try {
    const saida = execFileSync('claude', ['-p', '--max-turns', '1'], {
      input: entrada,
      encoding: 'utf8',
      timeout: 180_000,
      shell: process.platform === 'win32',
      // Fora da raiz do projeto de propósito: assim o Claude headless não carrega o
      // `.claude/settings.json`, não dispara o hook Stop de novo (laço de captura) e não tem
      // o código do projeto à mão para sair "resolvendo" o que leu no transcript.
      cwd: os.tmpdir(),
    }).trim();

    // Só aceita se vier no formato pedido. Resposta fora do formato é descartada, não salva.
    const completa = CATEGORIAS_ESPERADAS.every((c) => new RegExp(`^##\\s+${c}\\b`, 'mi').test(saida));
    return completa ? saida : null;
  } catch {
    return null;
  }
}

/** Fallback: sem CLI, registra só sinais objetivos — nunca inventa causa raiz. */
function extrairHeuristico(contexto: string): string {
  const linhas = contexto.split('\n');
  const erros = linhas.filter((l) => /\b(error|failed|FAIL|Exception|not found|AÇÃO BLOQUEADA)\b/i.test(l)).slice(-15);
  const comandos = [...new Set(linhas.filter((l) => /\[ferramenta (Bash|PowerShell)\]/.test(l)))].slice(-15);

  return [
    '## bugs',
    '- (nada nesta sessão — extração heurística não identifica causa raiz)',
    '',
    '## arquitetura',
    '- (nada nesta sessão)',
    '',
    '## padrao',
    comandos.length ? comandos.map((c) => `- comando executado: ${c.slice(0, 200)}`).join('\n') : '- (nada nesta sessão)',
    '',
    '## falha',
    erros.length ? erros.map((e) => `- sinal de falha: ${e.trim().slice(0, 200)}`).join('\n') : '- (nada nesta sessão)',
  ].join('\n');
}

function main() {
  const { agent, slug, transcript } = lerArgs();
  const bruto = transcript && fs.existsSync(transcript) ? fs.readFileSync(transcript, 'utf8') : lerStdin();

  if (!bruto.trim()) {
    process.stderr.write('[summarize] sem contexto para resumir — nada a fazer\n');
    process.exit(0);
  }

  const contexto = normalizarTranscript(bruto);
  const comClaude = extrairComClaude(contexto);
  const corpo = comClaude ?? extrairHeuristico(contexto);

  const data = new Date().toISOString().slice(0, 10);
  const nome = `${data}-${agent}-${slug}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase() + '.md';
  const destino = path.join(process.cwd(), '.claude', 'knowledge', nome);
  fs.mkdirSync(path.dirname(destino), { recursive: true });

  const frontmatter = [
    '---',
    `agent: ${agent}`,
    `slug: ${slug}`,
    `data: ${data}`,
    `origem: ${comClaude ? 'claude' : 'heuristica'}`,
    '---',
    '',
    `# Aprendizados — ${agent} · ${slug} · ${data}`,
    '',
  ].join('\n');

  fs.writeFileSync(destino, frontmatter + corpo + '\n', 'utf8');
  process.stdout.write(destino + '\n');
}

main();
