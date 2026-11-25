import { peaks, reverseChannels } from './reverse';

test('reverseChannels reverses each channel without mutating input', () => {
  const a = Float32Array.from([1, 2, 3]);
  const b = Float32Array.from([4, 5]);
  const [ra, rb] = reverseChannels([a, b]);
  expect(Array.from(ra)).toEqual([3, 2, 1]);
  expect(Array.from(rb)).toEqual([5, 4]);
  expect(Array.from(a)).toEqual([1, 2, 3]);
});

test('peaks normalises to the loudest section', () => {
  const data = Float32Array.from([0.1, -0.2, 0.5, -1, 0, 0.25]);
  const p = peaks(data, 3);
  [0.2, 1, 0.25].forEach((v, i) => expect(p[i]).toBeCloseTo(v, 5));
});

test('peaks handles silence and empty input', () => {
  expect(peaks(new Float32Array(10), 4)).toEqual([0, 0, 0, 0]);
  expect(peaks(new Float32Array(0), 2)).toEqual([0, 0]);
});
