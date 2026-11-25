import { initialTurn, turnReducer } from './turnFlow';

const run = (actions, state = initialTurn) => actions.reduce(turnReducer, state);
const blob = (name) => ({ name });

test('a blank guess does not advance', () => {
  expect(run([{ type: 'SET_GUESS', guess: '   ' }, { type: 'CONFIRM_GUESS' }]).stage).toBe('guess');
});

test('confirming trims the guess and moves to say', () => {
  const s = run([{ type: 'SET_GUESS', guess: '  pickle jar ' }, { type: 'CONFIRM_GUESS' }]);
  expect(s.stage).toBe('say');
  expect(s.guess).toBe('pickle jar');
});

test('full happy path ends in sent', () => {
  const s = run([
    { type: 'SET_GUESS', guess: 'pickle' },
    { type: 'CONFIRM_GUESS' },
    { type: 'RECORDED_FORWARDS', blob: blob('f') },
    { type: 'RECORDED_BACKWARDS', blob: blob('b') },
    { type: 'SEND' },
    { type: 'SENT' },
  ]);
  expect(s.stage).toBe('sent');
  expect(s.sending).toBe(false);
});

test('cannot send without a backwards take, or twice at once', () => {
  const ready = run([
    { type: 'SET_GUESS', guess: 'pickle' },
    { type: 'CONFIRM_GUESS' },
    { type: 'RECORDED_FORWARDS', blob: blob('f') },
  ]);
  expect(turnReducer(ready, { type: 'SEND' }).sending).toBe(false);
  const sending = run([{ type: 'RECORDED_BACKWARDS', blob: blob('b') }, { type: 'SEND' }], ready);
  expect(sending.sending).toBe(true);
  expect(turnReducer(sending, { type: 'SEND' })).toBe(sending);
  expect(turnReducer(sending, { type: 'REDO_BACKWARDS' })).toBe(sending);
  expect(turnReducer(sending, { type: 'EDIT_GUESS' })).toBe(sending);
});

test('a failed send keeps the recording and shows the error', () => {
  const s = run([
    { type: 'SET_GUESS', guess: 'pickle' },
    { type: 'CONFIRM_GUESS' },
    { type: 'RECORDED_FORWARDS', blob: blob('f') },
    { type: 'RECORDED_BACKWARDS', blob: blob('b') },
    { type: 'SEND' },
    { type: 'SEND_FAILED', error: 'nope' },
  ]);
  expect(s.sending).toBe(false);
  expect(s.error).toBe('nope');
  expect(s.backwards).toEqual(blob('b'));
});

test('redoing forwards clears the backwards take', () => {
  const s = run([
    { type: 'SET_GUESS', guess: 'pickle' },
    { type: 'CONFIRM_GUESS' },
    { type: 'RECORDED_FORWARDS', blob: blob('f') },
    { type: 'RECORDED_BACKWARDS', blob: blob('b') },
    { type: 'REDO_FORWARDS' },
  ]);
  expect(s.stage).toBe('say');
  expect(s.backwards).toBeNull();
});
