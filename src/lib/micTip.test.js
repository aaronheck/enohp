import { isIOSSafari, playHistory, shouldOfferMicTip, markMicTipSeen } from './micTip';

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

test('offered from the third day played, if they have mimicked, once', () => {
  const ua = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(SAFARI);

  const days = (puzzles) => localStorage.setItem('yelnats.daily', JSON.stringify({ puzzles }));
  localStorage.clear();
  days({ 1: { solved: true, mimics: 1 }, 2: { solved: true, mimics: 0 }, 3: { heard: true } });
  expect(playHistory()).toEqual({ days: 2, mimicked: true });
  expect(shouldOfferMicTip()).toBe(false);
  days({ 1: { solved: true, mimics: 1 }, 2: { solved: true }, 3: { failed: true, guesses: ['x'] } });
  expect(shouldOfferMicTip()).toBe(true);
  days({ 1: { solved: true }, 2: { solved: true }, 3: { solved: true } });
  expect(shouldOfferMicTip()).toBe(false); // never used the mic
  days({ 1: { solved: true, mimics: 2 }, 2: { solved: true }, 3: { solved: true } });
  markMicTipSeen('x');
  expect(shouldOfferMicTip()).toBe(false);
  ua.mockRestore();

});
