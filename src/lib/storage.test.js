import { getNickname, getPlayedGames, rememberGame, setNickname } from './storage';

beforeEach(() => localStorage.clear());

test('reads nicknames stored by the old app as raw strings', () => {
  localStorage.setItem('nickname', 'Air bud');
  expect(getNickname()).toBe('Air bud');
});

test("treats the old app's cancelled-prompt value as no nickname", () => {
  localStorage.setItem('nickname', 'null');
  expect(getNickname()).toBe('');
});

test('round-trips a nickname', () => {
  setNickname('  Maya ');
  expect(getNickname()).toBe('Maya');
});

test('remembers games newest first without duplicates', () => {
  rememberGame({ id: 'a', guess: 'one', turn: 1 });
  rememberGame({ id: 'b', guess: 'two', turn: 2 });
  rememberGame({ id: 'a', guess: 'three', turn: 4 });
  expect(getPlayedGames().map((g) => g.id)).toEqual(['a', 'b']);
  expect(getPlayedGames()[0].guess).toBe('three');
});
