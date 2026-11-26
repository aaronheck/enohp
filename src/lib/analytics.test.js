import { deviceContext } from './analytics';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 380.0.0.0.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  androidTikTok: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 musical_ly_2023',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
};

test('browser and OS', () => {
  const pick = (ua, touch = 0) => {
    const c = deviceContext(ua, touch);
    return `${c.browser}/${c.os}/${c.mobile ? 'm' : 'd'}${c.in_app ? '/app' : ''}`;
  };
  expect(pick(UA.iphoneSafari)).toBe('safari/ios/m');
  expect(pick(UA.iphoneChrome)).toBe('chrome/ios/m');
  expect(pick(UA.iphoneInstagram)).toBe('instagram/ios/m/app');
  expect(pick(UA.androidChrome)).toBe('chrome/android/m');
  expect(pick(UA.androidSamsung)).toBe('samsung/android/m');
  expect(pick(UA.androidTikTok)).toBe('tiktok/android/m/app');
  expect(pick(UA.macSafari)).toBe('safari/mac/d');
  expect(pick(UA.macSafari, 5)).toBe('safari/ios/m'); // iPad
  expect(pick(UA.winEdge)).toBe('edge/windows/d');
  expect(typeof deviceContext(UA.iphoneSafari).tz).toBe('string');
});
