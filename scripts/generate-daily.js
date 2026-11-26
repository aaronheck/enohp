#!/usr/bin/env node
// Generates daily puzzle audio with Amazon Polly: for each puzzle and voice, the phrase
// forwards (the answer) and reversed (the puzzle). Files never contain the phrase.
//
//   node scripts/generate-daily.js --from 1 --to 60 [--upload] [--out .daily-audio]
//
// Writes to --out (default .daily-audio/, used by the mock API) and, with --upload,
// copies to s3://enohp/daily/<n>/. Needs the AWS CLI (profile from AWS_PROFILE) and ffmpeg.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const daily = require('../lambda/daily');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const from = Number(opt('from', 1));
const to = Number(opt('to', from));
const out = path.resolve(opt('out', path.join(__dirname, '..', '.daily-audio')));
const upload = args.includes('--upload');
const BUCKET = process.env.RECORDING_BUCKET || 'enohp';

const run = (cmd, a) => execFileSync(cmd, a, { stdio: ['ignore', 'ignore', 'inherit'] });

for (let n = from; n <= to; n++) {
  const phrase = daily.phraseFor(n);
  for (const v of daily.VOICES) {
    const answer = path.join(out, daily.answerKey(n, v.id));
    const puzzle = path.join(out, daily.puzzleKey(n, v.id));
    fs.mkdirSync(path.dirname(answer), { recursive: true });
    // A short pause either side so the reversed clip doesn't start abruptly.
    const ssml = `<speak><break time="150ms"/>${phrase.replace(/[<>&]/g, '')}<break time="150ms"/></speak>`;
    run('aws', ['polly', 'synthesize-speech', '--region', 'us-east-1', '--engine', 'neural', '--voice-id', v.id,
      '--text-type', 'ssml', '--text', ssml, '--output-format', 'mp3', answer]);
    run('ffmpeg', ['-v', 'error', '-y', '-i', answer, '-af', 'areverse', '-codec:a', 'libmp3lame', '-q:a', '4', puzzle]);
    if (upload) {
      for (const [file, key] of [[answer, daily.answerKey(n, v.id)], [puzzle, daily.puzzleKey(n, v.id)]]) {
        run('aws', ['s3', 'cp', file, `s3://${BUCKET}/${key}`, '--region', 'us-east-1', '--content-type', 'audio/mpeg', '--only-show-errors']);
      }
    }
  }
  console.log(`puzzle #${n} done${upload ? ' (uploaded)' : ''}`);
}
