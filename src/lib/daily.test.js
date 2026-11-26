import { canMimic, getPuzzleState, hasPlayedDaily, plural, result, shareText, streak, strokes, updatePuzzleState } from './daily';

beforeEach(() => localStorage.clear());

// guesses = wrong guesses; solved adds the winning guess.
const st = (over) => ({ mimics: 0, guesses: [], actions: [], solved: true, failed: false, ...over });
const live = (over) => st({ solved: false, ...over });

test('strokes: every guess (incl. the right one) and every mimic after the first', () => {
  expect(strokes(st({}))).toBe(1);
  expect(strokes(st({ mimics: 1 }))).toBe(1);
  expect(strokes(st({ mimics: 3 }))).toBe(3);
  expect(strokes(st({ mimics: 2, guesses: ['a'] }))).toBe(3);
  expect(strokes(live({ guesses: ['a', 'b'] }))).toBe(2);
});

test('results around par 2', () => {
  expect(result(st({})).name).toBe('Mind reader');
  expect(result(st({ mimics: 1 })).name).toBe('Hole in one');
  expect(result(st({ guesses: ['a'] })).name).toBe('Par');
  expect(result(st({ mimics: 2 })).name).toBe('Par');
  expect(result(st({ mimics: 2, guesses: ['a'] })).name).toBe('Bogey');
  expect(result(st({ guesses: ['a', 'b', 'c'] })).name).toBe('Double bogey');
  expect(result(st({ guesses: ['a', 'b', 'c', 'd'] })).name).toBe('Triple bogey');
  expect(result(st({ solved: false, failed: true, guesses: ['a', 'b', 'c', 'd', 'e'] })).name).toBe('End of the line');
});

test('a mimic can never be the 5th stroke; the first mimic is always allowed', () => {
  expect(canMimic(live({ guesses: ['a', 'b', 'c', 'd'] }))).toBe(true); // 4 strokes, first mimic is free
  expect(canMimic(live({ mimics: 1, guesses: ['a', 'b', 'c', 'd'] }))).toBe(false); // would be stroke 5
  expect(canMimic(live({ mimics: 4 }))).toBe(true); // 3 strokes -> 4
  expect(canMimic(live({ mimics: 5 }))).toBe(false); // 4 strokes used
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

test('share text has the result and the trail, never the answer', () => {
  const text = shareText(12, st({ mimics: 2, guesses: ['x'], actions: ['mimic', 'miss', 'mimic', 'hit'], phrase: 'peanut butter' }), 'https://yelnatsgame.com');
  expect(text).toBe('Yelnats Daily #12\n🌧️ Bogey · 3 strokes\n🎙❌🎙✅\nhttps://yelnatsgame.com');
  expect(text).not.toMatch(/peanut/);
});

test('first-timer detection and plurals', () => {
  expect(hasPlayedDaily()).toBe(false);
  updatePuzzleState(1, { guesses: ['x'] });
  expect(hasPlayedDaily()).toBe(true);
  expect([plural(1, 'guess'), plural(2, 'guess'), plural(1, 'stroke')]).toEqual(['1 guess', '2 guesses', '1 stroke']);
});
