import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? './data/browseraudit.db';

let _db = null;

export function getDb() {
  if (_db) { return _db; }

  mkdirSync(dirname(DB_PATH), { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -16000'); // 16MB cache

  const schema = readFileSync(join(__dir, 'schema.sql'), 'utf8');
  _db.exec(schema);

  return _db;
}

export function closeDb() {
  if (_db) { _db.close(); _db = null; }
}
