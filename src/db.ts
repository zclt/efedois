import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'monitor.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker        TEXT NOT NULL,
    data          TEXT NOT NULL,
    consultado_em TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS portfolio (
    ticker TEXT PRIMARY KEY,
    cotas  INTEGER NOT NULL DEFAULT 0
  );
`);

const MAX_HIST = 10;

type Row = { value: string };
type HistRow = { data: string };
type PortRow = { ticker: string; cotas: number };

export function getConfig(): { fiis: string[]; intervalSec: number } {
  const fiis = db.prepare('SELECT value FROM config WHERE key = ?').get('fiis') as Row | undefined;
  const interval = db.prepare('SELECT value FROM config WHERE key = ?').get('intervalSec') as Row | undefined;
  return {
    fiis: fiis ? JSON.parse(fiis.value) : ['MXRF11', 'HGLG11'],
    intervalSec: interval ? Number(interval.value) : 60,
  };
}

export function setConfig(fiis: string[], intervalSec: number): void {
  const upsert = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
  upsert.run('fiis', JSON.stringify(fiis));
  upsert.run('intervalSec', String(intervalSec));
}

export function getHistory(): Record<string, object[]> {
  const rows = db.prepare(
    'SELECT ticker, data FROM history ORDER BY ticker, consultado_em DESC'
  ).all() as (HistRow & { ticker: string })[];

  const result: Record<string, object[]> = {};
  for (const row of rows) {
    if (!result[row.ticker]) result[row.ticker] = [];
    if (result[row.ticker].length < MAX_HIST) result[row.ticker].push(JSON.parse(row.data));
  }
  return result;
}

export function pushHistory(ticker: string, data: object): object[] {
  const consultado_em = (data as Record<string, string>).consultado_em ?? new Date().toISOString();

  db.prepare('INSERT INTO history (ticker, data, consultado_em) VALUES (?, ?, ?)').run(
    ticker, JSON.stringify(data), consultado_em
  );

  db.prepare(`
    DELETE FROM history WHERE ticker = ? AND id NOT IN (
      SELECT id FROM history WHERE ticker = ? ORDER BY consultado_em DESC LIMIT ?
    )
  `).run(ticker, ticker, MAX_HIST);

  return (db.prepare(
    'SELECT data FROM history WHERE ticker = ? ORDER BY consultado_em DESC LIMIT ?'
  ).all(ticker, MAX_HIST) as HistRow[]).map(r => JSON.parse(r.data));
}

export function getPortfolio(): Record<string, number> {
  const rows = db.prepare('SELECT ticker, cotas FROM portfolio').all() as PortRow[];
  return Object.fromEntries(rows.map(r => [r.ticker, r.cotas]));
}

export function setPortfolioEntry(ticker: string, cotas: number): void {
  if (cotas === 0) {
    db.prepare('DELETE FROM portfolio WHERE ticker = ?').run(ticker);
  } else {
    db.prepare('INSERT OR REPLACE INTO portfolio (ticker, cotas) VALUES (?, ?)').run(ticker, cotas);
  }
}
