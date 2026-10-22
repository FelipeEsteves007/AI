/**
 * Schema e acesso ao banco de conhecimento do RAG.
 *
 * SQLite + sqlite-vec. Duas estruturas que andam juntas:
 *   - `knowledge`      → a linha canônica (id, path, content, embedding, category, agent, created_at)
 *   - `knowledge_vec`  → tabela virtual vec0, indexada por `rowid` = `knowledge.id`, onde a
 *                        busca por similaridade realmente acontece (KNN)
 *
 * O embedding fica nos dois lugares de propósito: em `knowledge` porque o schema pedido o exige
 * e porque permite reindexar sem recalcular; em `knowledge_vec` porque é lá que o sqlite-vec
 * consegue fazer `MATCH`.
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import fs from 'node:fs';
import path from 'node:path';

/** Dimensão do all-MiniLM-L6-v2. */
export const DIMENSOES = 384;

export const CATEGORIAS = ['bug', 'arquitetura', 'padrao', 'falha'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type Chunk = {
  path: string;
  content: string;
  embedding: Float32Array;
  category: Categoria;
  agent: string;
};

export type Resultado = {
  id: number;
  path: string;
  content: string;
  category: Categoria;
  agent: string;
  created_at: string;
  distancia: number;
};

export function caminhoBanco(raiz = process.cwd()): string {
  return path.join(raiz, '.claude', 'rag.db');
}

export function abrirBanco(arquivo = caminhoBanco()) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new Database(arquivo);
  sqliteVec.load(db);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      path       TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      embedding  BLOB    NOT NULL,
      category   TEXT    NOT NULL CHECK (category IN ('bug','arquitetura','padrao','falha')),
      agent      TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_agent    ON knowledge (agent);
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge (category);
    CREATE INDEX IF NOT EXISTS idx_knowledge_path     ON knowledge (path);

    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_vec USING vec0(
      embedding float[${DIMENSOES}]
    );
  `);

  return db;
}

/** Remove o que já foi indexado a partir de um arquivo — deixa o embed idempotente. */
export function limparPath(db: Database.Database, arquivo: string) {
  const ids = db.prepare('SELECT id FROM knowledge WHERE path = ?').all(arquivo) as { id: number }[];
  if (!ids.length) return 0;
  const apagaVec = db.prepare('DELETE FROM knowledge_vec WHERE rowid = ?');
  const apaga = db.prepare('DELETE FROM knowledge WHERE id = ?');
  const tx = db.transaction((linhas: { id: number }[]) => {
    for (const { id } of linhas) {
      apagaVec.run(BigInt(id)); // sqlite-vec só aceita rowid como BigInt
      apaga.run(id);
    }
  });
  tx(ids);
  return ids.length;
}

export function inserirChunks(db: Database.Database, chunks: Chunk[]) {
  const insere = db.prepare(
    `INSERT INTO knowledge (path, content, embedding, category, agent)
     VALUES (@path, @content, @embedding, @category, @agent)`,
  );
  const insereVec = db.prepare('INSERT INTO knowledge_vec (rowid, embedding) VALUES (?, ?)');

  const tx = db.transaction((linhas: Chunk[]) => {
    for (const c of linhas) {
      const blob = Buffer.from(c.embedding.buffer);
      const { lastInsertRowid } = insere.run({ ...c, embedding: blob });
      insereVec.run(BigInt(lastInsertRowid), blob); // BigInt: o vec0 recusa Number no rowid
    }
  });
  tx(chunks);
  return chunks.length;
}

/** KNN puro: os `k` chunks mais próximos do embedding da pergunta. */
export function buscarVizinhos(
  db: Database.Database,
  embedding: Float32Array,
  k: number,
): Resultado[] {
  return db
    .prepare(
      `SELECT k.id, k.path, k.content, k.category, k.agent, k.created_at, v.distance AS distancia
         FROM knowledge_vec v
         JOIN knowledge k ON k.id = v.rowid
        WHERE v.embedding MATCH ? AND k = ?
        ORDER BY v.distance`,
    )
    .all(Buffer.from(embedding.buffer), k) as Resultado[];
}
