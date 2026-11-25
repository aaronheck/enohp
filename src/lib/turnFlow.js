// State machine for one player's turn.
//
//   guess  -> listen to the previous recording (rewound) and type what you heard,
//             or, for the first player, pick the starting word
//   say    -> record the guess forwards (practice; never uploaded)
//   copy   -> hear the forwards take flipped, then imitate it (the backwards take)
//   sent   -> backwards take uploaded; share the link

export const STAGES = ['guess', 'say', 'copy', 'sent'];

export const initialTurn = {
  stage: 'guess',
  guess: '',
  forwards: null,
  backwards: null,
  sending: false,
  error: null,
};

export function turnReducer(state, action) {
  switch (action.type) {
    case 'SET_GUESS':
      return { ...state, guess: action.guess };
    case 'CONFIRM_GUESS': {
      const guess = state.guess.trim();
      if (!guess) return state;
      return { ...state, guess, stage: 'say', error: null };
    }
    case 'EDIT_GUESS':
      if (state.sending || state.stage === 'sent') return state;
      return { ...state, stage: 'guess', forwards: null, backwards: null, error: null };
    case 'RECORDED_FORWARDS':
      return { ...state, forwards: action.blob, backwards: null, stage: 'copy', error: null };
    case 'REDO_FORWARDS':
      if (state.sending) return state;
      return { ...state, forwards: null, backwards: null, stage: 'say', error: null };
    case 'RECORDED_BACKWARDS':
      return { ...state, backwards: action.blob, error: null };
    case 'REDO_BACKWARDS':
      if (state.sending) return state;
      return { ...state, backwards: null, error: null };
    case 'SEND':
      if (!state.backwards || state.sending) return state;
      return { ...state, sending: true, error: null };
    case 'SENT':
      return { ...state, sending: false, stage: 'sent' };
    case 'SEND_FAILED':
      return { ...state, sending: false, error: action.error };
    default:
      return state;
  }
}
