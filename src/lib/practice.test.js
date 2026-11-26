import { coachStep, isCorrect, markPracticeDone, practiceDone } from './practice';

test('coach steps: listen -> mimic -> stop -> hear, once', () => {
  expect(coachStep({ heard: false, recording: false, mimics: 0, coached: false })).toBe('listen');
  expect(coachStep({ heard: true, recording: false, mimics: 0, coached: false })).toBe('mimic');
  expect(coachStep({ heard: true, recording: true, mimics: 0, coached: false })).toBe('stop');
  expect(coachStep({ heard: true, recording: false, mimics: 1, coached: false })).toBe('hear');
  expect(coachStep({ heard: true, recording: true, mimics: 1, coached: true })).toBe(null); // mimic again: no tips
});

test('practice answers are forgiving', () => {
  expect(isCorrect('Cupcake!', 'cupcake')).toBe(true);
  expect(isCorrect('rubber duk', 'rubber duck')).toBe(true);
  expect(isCorrect('good god', 'good dog')).toBe(false);
});

test('practice progress', () => {
  localStorage.clear();
  markPracticeDone(2);
  markPracticeDone(1);
  markPracticeDone(2);
  expect(practiceDone()).toEqual([1, 2]);
});
