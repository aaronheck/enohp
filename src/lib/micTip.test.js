import { isIOSSafari, playHistory, shouldPopMicTip, shouldShowMicCard, markMicTip } from './micTip';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36';

test('only Safari on iPhone/iPad', () => {
  expect(isIOSSafari(SAFARI, 5)).toBe(true);
  expect(isIOSSafari(IPAD, 5)).toBe(true);
  expect(isIOSSafari(IPAD, 0)).toBe(false); // a real Mac
  expect(isIOSSafari(CHROME_IOS, 5)).toBe(false);
  expect(isIOSSafari(ANDROID, 5)).toBe(false);
});

describe('on iPhone Safari', () => {
  let ua;
  beforeEach(() => {
    ua = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(SAFARI);
    localStorage.clear();
  });
  afterEach(() => ua.mockRestore());
  const days = (puzzles) => localStorage.setItem('yelnats.daily', JSON.stringify({ puzzles }));

  test('pops up on the 3rd day (2 earlier days played, mic used), not the 2nd', () => {
    days({ 1: { solved: true, mimics: 1 }, 2: { heard: true } });
    expect(shouldPopMicTip(2)).toBe(false); // day 2
    days({ 1: { solved: true, mimics: 1 }, 2: { failed: true, guesses: ['x'] }, 3: { heard: true } });
    expect(playHistory(3)).toEqual({ daysBefore: 2, mimicked: true });
    expect(shouldPopMicTip(3)).toBe(true); // day 3
    days({ 1: { solved: true }, 2: { solved: true } });
    expect(shouldPopMicTip(3)).toBe(false); // never used the mic
  });

  test('"Not now": results card that day only; then never again', () => {
    days({ 1: { solved: true, mimics: 1 }, 2: { solved: true } });
    markMicTip('later', 3);
    expect(shouldPopMicTip(3)).toBe(false);
    expect(shouldShowMicCard(3)).toBe(true);
    expect(shouldShowMicCard(4)).toBe(false);
    expect(shouldPopMicTip(4)).toBe(false);
    markMicTip('done', 3);
    expect(shouldShowMicCard(3)).toBe(false);
  });
});
