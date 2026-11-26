import { coachStep, isCorrect, markPracticeDone, practiceDone } from './practice';

test('coach steps follow listen -> mimic -> stop -> hear -> guess', () => {
  expect(coachStep({ heard: false, recording: false, mimics: 0, heardMimic: false })).toBe('listen');
  expect(coachStep({ heard: true, recording: false, mimics: 0, heardMimic: false })).toBe('mimic');
  expect(coachStep({ heard: true, recording: true, mimics: 0, heardMimic: false })).toBe('stop');
  expect(coachStep({ heard: true, recording: false, mimics: 1, heardMimic: false })).toBe('hear');
  expect(coachStep({ heard: true, recording: false, mimics: 1, heardMimic: true })).toBe('guess');
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
