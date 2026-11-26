'use strict';
// Answer matching for the daily puzzle (and the practice games, which keep a copy in
// src/lib/match.js — keep the two in sync; a test checks they match).
//
// A guess counts if it says the same thing, allowing for:
//   - case, spaces, punctuation ("Peanut-Butter!")
//   - text-speak and shorthand ("c u later", "gonna")
//   - digits and number words ("2" = "two")
//   - words that sound the same, since you can't hear spelling ("sea" = "see", "too" = "to")
//   - a missing or extra "a", "an" or "the" (hard to hear backwards)
//   - a small typo on longer phrases
// ---- shared body: start ----
const SHORTHAND = {
  u: 'you', ya: 'you', yu: 'you', c: 'see', r: 'are', ur: 'your', y: 'why', n: 'and', b: 'be',
  gonna: 'going to', wanna: 'want to', gotta: 'got to', gimme: 'give me', lemme: 'let me', kinda: 'kind of',
  sorta: 'sort of', outta: 'out of', lotta: 'lot of', dunno: 'do not know', til: 'until', till: 'until',
  cuz: 'because', coz: 'because', cos: 'because', bc: 'because', pls: 'please', plz: 'please', ty: 'thank you',
  thx: 'thanks', k: 'okay', ok: 'okay', kk: 'okay', bday: 'birthday', nite: 'night', tho: 'though', thru: 'through',
  luv: 'love', bout: 'about', em: 'them', ppl: 'people', w: 'with', xmas: 'christmas', mr: 'mister', mrs: 'missus',
  dont: 'do not', cant: 'can not', cannot: 'can not', wont: 'will not', isnt: 'is not', arent: 'are not',
  didnt: 'did not', doesnt: 'does not', im: 'i am', ive: 'i have', id: 'i would', ill: 'i will', youre: 'you are',
  youll: 'you will', youve: 'you have', hes: 'he is', shes: 'she is', theyre: 'they are', were: 'were',
  lets: 'let us', thats: 'that is', whats: 'what is', its: 'it is', itll: 'it will', theres: 'there is',
};
const NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
// Each group sounds the same; every word maps to the group's first word.
const SOUND_ALIKE = [
  'to too two', 'for four fore', 'see sea', 'you ewe yew', 'be bee', 'are', 'your yore', 'there their',
  'no know', 'night knight', 'one won', 'eight ate', 'by buy bye', 'right write rite', 'here hear',
  'piece peace', 'sun son', 'tea tee', 'hole whole', 'new knew', 'meat meet', 'bear bare', 'sale sail',
  'tail tale', 'week weak', 'flower flour', 'i eye aye', 'hour our', 'so sew sow', 'made maid',
  'wait weight', 'high hi', 'dear deer', 'sell cell', 'which witch', 'would wood', 'rain reign rein',
  'road rode rowed', 'seen scene', 'steal steel', 'through threw', 'where wear ware', 'weather whether',
  'aloud allowed', 'break brake', 'role roll', 'board bored', 'plain plane', 'pair pear pare', 'male mail',
  'some sum', 'blue blew', 'nose knows', 'pie pi', 'bee b', 'way weigh whey', 'not knot', 'red read',
  'hair hare', 'four for', 'missed mist', 'past passed', 'cent scent sent', 'son sun', 'bored board',
  'morning mourning', 'dough doe', 'jeans genes', 'cereal serial', 'toe tow', 'knead need', 'two to',
];
const CANON = {};
for (const group of SOUND_ALIKE) {
  const [head, ...rest] = group.split(' ');
  if (!(head in CANON)) CANON[head] = head;
  for (const w of rest) if (!(w in CANON)) CANON[w] = CANON[head];
}
const ARTICLES = new Set(['a', 'an', 'the']);

function words(s) {
  const text = String(s || '')
    .toLowerCase()
    .replace(/[‘’']/g, '') // don't -> dont
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ');
  const out = [];
  for (const raw of text.split(/[^a-z0-9]+/)) {
    if (!raw) continue;
    let w = raw;
    if (/^\d+$/.test(w)) w = Number(w) <= 20 ? NUMBERS[Number(w)] : w;
    const expanded = SHORTHAND[w] || w;
    for (const part of expanded.split(' ')) out.push(CANON[part] || part);
  }
  return out;
}

function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Every way we'll read a phrase: as written, and with a/an/the dropped. */
function forms(s) {
  const plain = String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');
  const w = words(s);
  const noArticles = w.filter((x) => !ARTICLES.has(x));
  return [plain, w.join(''), noArticles.join('')].filter(Boolean);
}

/** Right answer? See the rules at the top of the file. */
function isCorrect(guess, phrase) {
  const gs = forms(guess);
  const ps = forms(phrase);
  if (!gs.length || !ps.length) return false;
  const allowed = ps[0].length >= 14 ? 2 : ps[0].length >= 8 ? 1 : 0;
  for (const g of gs) for (const p of ps) if (g === p || (allowed && editDistance(g, p) <= allowed)) return true;
  return false;
}
// ---- shared body: end ----

module.exports = { isCorrect, words };
