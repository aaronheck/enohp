import { getPuzzleState, golf, shareText, streak, updatePuzzleState } from './daily';

beforeEach(() => localStorage.clear());

test('golf names around par 2', () => {
  expect([0, 1, 2, 3, 4, 5, 7].map((m) => golf(m).name)).toEqual([
    'Mind reader',
    'Birdie',
    'Par',
    'Bogey',
    'Double bogey',
    '+3',
    '+5',
  ]);
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
  expect(streak(5)).toBe(3); // today not solved yet: still on a 3-day streak
  expect(streak(6)).toBe(0); // missed yesterday
});

test('share text has the result but never the answer', () => {
  const text = shareText(12, { mimics: 1, guesses: ['a', 'b'], voice: 'Kevin', phrase: 'peanut butter' }, 'https://yelnatsgame.com');
  expect(text).toBe('Yelnats Daily #12\n🐦 Birdie · 1 mimic\n❌❌✅\nhttps://yelnatsgame.com');
  expect(text).not.toMatch(/peanut/);
});

test('first-timer detection', () => {
  expect(require('./daily').hasPlayedDaily()).toBe(false);
  updatePuzzleState(1, { guesses: ['x'] });
  expect(require('./daily').hasPlayedDaily()).toBe(true);
});
