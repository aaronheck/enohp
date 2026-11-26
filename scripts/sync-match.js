// Copies the answer-matching rules from lambda/match.js into src/lib/match.js (the
// practice games check answers in the browser). Run after editing lambda/match.js.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../lambda/match.js'), 'utf8');
const body = src.split('// ---- shared body: start ----')[1].split('// ---- shared body: end ----')[0];
const out = `// GENERATED from lambda/match.js by scripts/sync-match.js. Don't edit here.
// ---- shared body: start ----${body}// ---- shared body: end ----

export { isCorrect, words };
`;
fs.writeFileSync(path.join(__dirname, '../src/lib/match.js'), out);
console.log('wrote src/lib/match.js');
