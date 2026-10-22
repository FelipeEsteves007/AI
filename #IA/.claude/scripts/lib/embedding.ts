/**
 * Embeddings locais com all-MiniLM-L6-v2 (384 dimensões), via @xenova/transformers.
 *
 * Roda na máquina, sem chamada de rede depois do primeiro download do modelo — combina com o
 * valor de controlabilidade da constitution: o conhecimento do projeto não sai daqui.
 */

import { pipeline, env } from '@xenova/transformers';
import path from 'node:path';

// Cache do modelo dentro do projeto, para não depender do HOME de cada máquina.
env.cacheDir = path.join(process.cwd(), '.claude', '.models');

const MODELO = 'Xenova/all-MiniLM-L6-v2';

let extrator: any = null;

async function obterExtrator() {
  if (!extrator) extrator = await pipeline('feature-extraction', MODELO);
  return extrator;
}

/** Vetor normalizado de um texto. */
export async function embed(texto: string): Promise<Float32Array> {
  const fn = await obterExtrator();
  const saida = await fn(texto, { pooling: 'mean', normalize: true });
  return new Float32Array(saida.data);
}

export async function embedLote(textos: string[]): Promise<Float32Array[]> {
  const vetores: Float32Array[] = [];
  for (const t of textos) vetores.push(await embed(t));
  return vetores;
}

/**
 * Quebra o texto em chunks de 200 a 300 tokens, cortando em fronteira de parágrafo sempre que
 * possível para não partir um aprendizado no meio.
 *
 * Aproximação de tokens: ~1,3 token por palavra (suficiente para dimensionar chunk; o modelo
 * trunca em 256 tokens de qualquer forma).
 */
export function chunk(texto: string, min = 200, max = 300): string[] {
  const tokens = (s: string) => Math.ceil(s.trim().split(/\s+/).filter(Boolean).length * 1.3);

  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let atual = '';

  const empurrar = () => {
    if (atual.trim()) chunks.push(atual.trim());
    atual = '';
  };

  for (const p of paragrafos) {
    // Parágrafo sozinho já estoura o teto: quebra por frase.
    if (tokens(p) > max) {
      empurrar();
      let pedaco = '';
      for (const frase of p.split(/(?<=[.!?])\s+/)) {
        if (tokens(pedaco + ' ' + frase) > max && pedaco) {
          chunks.push(pedaco.trim());
          pedaco = '';
        }
        pedaco += (pedaco ? ' ' : '') + frase;
      }
      if (pedaco.trim()) chunks.push(pedaco.trim());
      continue;
    }

    if (tokens(atual + '\n\n' + p) > max && tokens(atual) >= min) empurrar();
    atual += (atual ? '\n\n' : '') + p;
  }
  empurrar();

  // Junta o rabicho pequeno demais ao chunk anterior.
  if (chunks.length > 1 && tokens(chunks[chunks.length - 1]) < min / 2) {
    const rabicho = chunks.pop()!;
    chunks[chunks.length - 1] += '\n\n' + rabicho;
  }

  return chunks;
}
