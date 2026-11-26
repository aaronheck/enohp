import { canMimic, getPuzzleState, hasPlayedDaily, isMindReader, msUntilNextPuzzle, plural, score, shareText, streak, triesUsed, updatePuzzleState } from './daily';

beforeEach(() => localStorage.clear());

// guesses = wrong guesses; solved adds the winning guess.
const st = (over) => ({ mimics: 0, guesses: [], actions: [], solved: true, failed: false, ...over });
const live = (over) => st({ solved: false, ...over });

test('tries: every guess (incl. the right one) and every mimic after the first', () => {
  expect(triesUsed(st({}))).toBe(1);
  expect(triesUsed(st({ mimics: 1 }))).toBe(1);
  expect(triesUsed(st({ mimics: 3 }))).toBe(3);
  expect(triesUsed(st({ mimics: 2, guesses: ['a'] }))).toBe(3);
  expect(triesUsed(live({ guesses: ['a', 'b'] }))).toBe(2);
});

test('score is a count of tries (fewer is better), or "Out of tries"', () => {
  expect(score(st({}))).toBe('1 try');
  expect(score(st({ mimics: 2, guesses: ['a'] }))).toBe('3 tries');
  expect(score(st({ guesses: ['a', 'b', 'c', 'd'] }))).toBe('5 tries');
  expect(score(st({ solved: false, failed: true, guesses: ['a', 'b', 'c', 'd', 'e'] }))).toBe('Out of tries');
});

test('a mimic can never be the 5th try; the first mimic is always allowed', () => {
  expect(canMimic(live({ guesses: ['a', 'b', 'c', 'd'] }))).toBe(true); // 4 used, first mimic is free
  expect(canMimic(live({ mimics: 1, guesses: ['a', 'b', 'c', 'd'] }))).toBe(false); // would be try 5
  expect(canMimic(live({ mimics: 4 }))).toBe(true); // 3 used -> 4
  expect(canMimic(live({ mimics: 5 }))).toBe(false); // 4 used
  expect(canMimic(st({}))).toBe(false); // solved
});

test('progress is kept per puzzle', () => {
  updatePuzzleState(3, { mimics: 1 });
  updatePuzzleState(3, { guesses: ['nope'] });
  expect(getPuzzleState(3)).toMatchObject({ mimics: 1, guesses: ['nope'], solved: false });
  expect(getPuzzleState(4).mimics).toBe(0);
});

test('streak counts consecutive solved days and survives an unsolved today', () => {
  [2, 3, 4].forEach((n) => updatePuzzleState(n, { solved: true }));
  expect(streak(4)).toBe(3);
  expect(streak(5)).toBe(3);
  expect(streak(6)).toBe(0);
});

test('share text has the score and the trail, never the answer', () => {
  const text = shareText(12, st({ mimics: 2, guesses: ['x'], actions: ['mimic', 'miss', 'mimic', 'hit'], phrase: 'peanut butter' }), 'https://yelnatsgame.com');
  expect(text).toBe('Yelnats Daily #12 · 3 tries\n🎙❌🎙✅\nhttps://yelnatsgame.com');
  expect(shareText(12, st({ actions: ['hit'] }), null, 4)).toBe('Yelnats Daily #12 · 1 try 🤯 Mind reader\n✅\n🔥 4-day streak');
  expect(text).not.toMatch(/peanut/);
});

test('first-timer detection and plurals', () => {
  expect(hasPlayedDaily()).toBe(false);
  updatePuzzleState(1, { guesses: ['x'] });
  expect(hasPlayedDaily()).toBe(true);
  expect([plural(1, 'try'), plural(2, 'guess'), plural(1, 'mimic')]).toEqual(['1 try', '2 guesses', '1 mimic']);
});

test('mind reader: first guess right, no mimic', () => {
  expect(isMindReader(st({}))).toBe(true);
  expect(isMindReader(st({ mimics: 1 }))).toBe(false); // even the free mimic counts
  expect(isMindReader(st({ guesses: ['a'] }))).toBe(false);
  expect(shareText(3, st({ actions: ['hit'] }), 'u')).toBe('Yelnats Daily #3 · 1 try 🤯 Mind reader\n✅\nu');
});

test('countdown to the next puzzle at Pacific midnight', () => {
  // 2026-11-25 22:30 Pacific (= 2026-11-26 06:30 UTC) -> 1h30m to go
  expect(msUntilNextPuzzle(Date.parse('2026-11-26T06:30:00Z'))).toBe(90 * 60 * 1000);
  // just after midnight Pacific -> almost a full day
  expect(msUntilNextPuzzle(Date.parse('2026-11-26T08:00:01Z'))).toBe(86400000 - 1000);
});
