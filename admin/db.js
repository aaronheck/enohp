'use strict';
// The puzzle review database (SQLite, built into Node). Lives outside the repo:
// ~/yelnats-admin-data/review.db, with audio files next to it.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA = process.env.ADMIN_DATA || path.join(process.env.HOME, 'yelnats-admin-data');
fs.mkdirSync(path.join(DATA, 'audio'), { recursive: true });

function open(file = path.join(DATA, 'review.db')) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY,
      phrase TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      verdict TEXT CHECK (verdict IN ('keep', 'ditch')),
      difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
      notes TEXT,
      reviewed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS plays (
      id INTEGER PRIMARY KEY,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      outcome TEXT CHECK (outcome IN ('solved', 'failed')),
      tries INTEGER,
      mimics INTEGER,
      actions TEXT
    );
    CREATE TABLE IF NOT EXISTS guesses (
      id INTEGER PRIMARY KEY,
      play_id INTEGER NOT NULL REFERENCES plays(id),
      candidate_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      correct INTEGER NOT NULL,
      at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS mimics (
      id INTEGER PRIMARY KEY,
      play_id INTEGER NOT NULL REFERENCES plays(id),
      candidate_id INTEGER NOT NULL,
      file TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

module.exports = { open, DATA };
