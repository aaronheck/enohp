#!/usr/bin/env node
// Adds candidate puzzles to the review database and makes their audio (Amazon Polly,
// Kevin, same as the daily puzzles). Prints only the new IDs, never the phrases, so
// Aaron can play them blind.
//   echo '<base64 of a JSON array of phrases>' | node admin/add-candidates.js
//   node admin/add-candidates.js --plain "phrase one" "phrase two"
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { open, DATA } = require('./db');

const AWS = process.env.AWS_CLI || path.join(process.env.HOME, '.local/bin/aws');
const run = (cmd, a) => execFileSync(cmd, a, { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, AWS_PROFILE: process.env.AWS_PROFILE || 'enohp' } });

let phrases;
if (process.argv[2] === '--plain') phrases = process.argv.slice(3);
else phrases = JSON.parse(Buffer.from(fs.readFileSync(0, 'utf8').trim(), 'base64').toString('utf8'));

const db = open();
const next = () => Math.max(100, db.prepare('SELECT MAX(id) m FROM candidates').get().m || 0) + 1;
const added = [];
for (const raw of phrases) {
  const phrase = String(raw).trim().toLowerCase();
  if (!phrase) continue;
  if (db.prepare('SELECT 1 FROM candidates WHERE phrase = ?').get(phrase)) {
    console.log('skipped a duplicate');
    continue;
  }
  const id = next();
  const dir = path.join(DATA, 'audio', String(id));
  fs.mkdirSync(dir, { recursive: true });
  const answer = path.join(dir, 'answer.mp3');
  const puzzle = path.join(dir, 'puzzle.mp3');
  const ssml = `<speak><break time="150ms"/>${phrase.replace(/[<>&]/g, '')}<break time="150ms"/></speak>`;
  run(AWS, ['polly', 'synthesize-speech', '--region', 'us-east-1', '--engine', 'neural', '--voice-id', 'Kevin', '--text-type', 'ssml', '--text', ssml, '--output-format', 'mp3', answer]);
  run('ffmpeg', ['-v', 'error', '-y', '-i', answer, '-af', 'areverse', '-codec:a', 'libmp3lame', '-q:a', '4', puzzle]);
  db.prepare('INSERT INTO candidates (id, phrase) VALUES (?, ?)').run(id, phrase);
  added.push(id);
}
console.log(`added candidates: ${added.map((i) => '#' + i).join(' ') || 'none'}`);
