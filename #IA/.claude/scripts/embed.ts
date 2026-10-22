/**
 * embed.ts — indexa um arquivo de aprendizados no `rag.db`.
 *
 * Lê o `.md` gerado pelo summarize, separa por categoria (as seções `## bugs`, `## arquitetura`,
 * `## padrao`, `## falha`), quebra cada seção em chunks de 200-300 tokens, gera o embedding com
 * all-MiniLM-L6-v2 e insere em `knowledge` + `knowledge_vec` com o agent e a categoria.
 *
 * Uso:
 *   npx tsx .claude/scripts/embed.ts .claude/knowledge/2026-09-12-backend-api-task-207.md
 *   npx tsx .claude/scripts/embed.ts --todos     # reindexa a pasta inteira
 */

import fs from 'node:fs';
import path from 'node:path';
import { abrirBanco, inserirChunks, limparPath, CATEGORIAS, type Categoria, type Chunk } from './lib/db.js';
import { chunk, embed } from './lib/embedding.js';

const VAZIO = /^\s*-?\s*\(nada nesta sessão\)\s*$/i;

function agentDoArquivo(texto: string, arquivo: string): string {
  const m = texto.match(/^agent:\s*(.+)$/m);
  if (m) return m[1].trim();
  // fallback: YYYY-MM-DD-<agent>-<slug>.md
  const base = path.basename(arquivo, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return base.split('-').slice(0, 2).join('-') || 'desconhecido';
}

/** Divide o markdown nas quatro seções conhecidas. */
export function separarSecoes(texto: string): Record<Categoria, string> {
  const secoes = Object.fromEntries(CATEGORIAS.map((c) => [c, ''])) as Record<Categoria, string>;
  let atual: Categoria | null = null;

  for (const linha of texto.split('\n')) {
    const titulo = linha.match(/^##\s+(\w+)/);
    if (titulo) {
      const nome = titulo[1].toLowerCase() as Categoria;
      atual = (CATEGORIAS as readonly string[]).includes(nome) ? nome : null;
      continue;
    }
    if (atual && !VAZIO.test(linha)) secoes[atual] += linha + '\n';
  }
  return secoes;
}

async function indexar(arquivo: string) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  const agent = agentDoArquivo(texto, arquivo);
  const relativo = path.relative(process.cwd(), arquivo).split(path.sep).join('/');

  const db = abrirBanco();
  const removidos = limparPath(db, relativo);

  const chunks: Chunk[] = [];
  const secoes = separarSecoes(texto);

  for (const categoria of CATEGORIAS) {
    const conteudo = secoes[categoria].trim();
    if (!conteudo) continue;
    for (const pedaco of chunk(conteudo)) {
      chunks.push({
        path: relativo,
        // o cabeçalho dá contexto ao vetor: sem ele, "- usar uuid()" perde o assunto
        content: `[${categoria}] ${pedaco}`,
        embedding: await embed(`${categoria}: ${pedaco}`),
        category: categoria,
        agent,
      });
    }
  }

  if (!chunks.length) {
    process.stdout.write(`[embed] ${relativo}: nenhum aprendizado a indexar\n`);
    db.close();
    return;
  }

  inserirChunks(db, chunks);
  db.close();
  process.stdout.write(
    `[embed] ${relativo}: ${chunks.length} chunks indexados` +
      (removidos ? ` (${removidos} antigos substituídos)` : '') +
      `\n`,
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const pasta = path.join(process.cwd(), '.claude', 'knowledge');

  const arquivos = argv.includes('--todos')
    ? (fs.existsSync(pasta) ? fs.readdirSync(pasta).filter((f) => f.endsWith('.md')).map((f) => path.join(pasta, f)) : [])
    : argv.filter((a) => a.endsWith('.md'));

  if (!arquivos.length) {
    process.stderr.write('[embed] informe um arquivo .md ou use --todos\n');
    process.exit(1);
  }

  for (const arquivo of arquivos) await indexar(path.resolve(arquivo));
}

main().catch((erro) => {
  process.stderr.write(`[embed] falhou: ${erro?.message ?? erro}\n`);
  process.exit(1);
});
