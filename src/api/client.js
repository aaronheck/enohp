// All calls to the Yelnats backend (API Gateway -> Lambda) live here.

export const API_BASE =
  process.env.REACT_APP_API_BASE ||
  'https://b7tfgad8z3.execute-api.us-east-2.amazonaws.com/test';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Errors come back as {"error": "..."} (current backend) or plain text (older one).
function errorText(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.error === 'string') return parsed.error;
  } catch (e) {
    // not JSON
  }
  return text;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch (e) {
    throw new ApiError("Couldn't reach the server. Check your connection.", 0);
  }
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(errorText(text) || `Request failed (${res.status})`, res.status);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new ApiError('The server sent back something unexpected.', res.status);
  }
}

/** Creates an empty game and returns its id. */
export async function createGame(settings = {}) {
  const body = await request('/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return body.id;
}

/**
 * Fetches a game. Each turn has { guess, nickname, recording, signedGet, consistencyToken }.
 * signedGet URLs expire after 5 minutes.
 */
export async function getGame(id) {
  if (!id) throw new ApiError('Game not found', 404);
  const body = await request('/game?id=' + encodeURIComponent(id));
  if (!body.game || !body.game.id) throw new ApiError('Game not found', 404);
  return { ...body.game, turns: body.game.turns || [] };
}

/**
 * Saves a turn and uploads its (backwards) recording.
 * consistencyToken is the previous turn's token ('' for the first turn); the
 * backend rejects the save if someone else has already played after that turn.
 */
export async function submitTurn({ gameId, consistencyToken, nickname, guess, recording }) {
  const { url } = await request('/recording', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: gameId, consistencyToken, nickname, guess }),
  });
  // The presigned URL is signed for Content-Type audio/wav; the bytes are whatever
  // MediaRecorder produced, which decodeAudioData sniffs on playback.
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/wav' },
      body: recording,
    });
  } catch (e) {
    throw new ApiError("Couldn't upload your recording. Check your connection.", 0);
  }
  if (!res.ok) throw new ApiError("Couldn't upload your recording.", res.status);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Downloads a turn's recording as a Blob. With `retries`, a missing file
 * (S3 answers 403/404 before the upload lands) is retried every 1.5 s.
 */
export async function fetchRecording(signedUrl, { retries = 0 } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res = null;
    try {
      res = await fetch(signedUrl);
    } catch (e) {
      // network error; retry below
    }
    if (res && res.ok) return res.blob();
    const retryable = !res || res.status === 403 || res.status === 404;
    if (!retryable || attempt >= retries) {
      throw new ApiError("Couldn't download the recording.", res ? res.status : 0);
    }
    await sleep(1500);
  }
}

/**
 * Today's daily puzzle: { number, date, voices: [{ id, label }], audio: { <voice>: url } }.
 * `number` asks for a specific puzzle (only honoured while the backend allows it).
 */
export async function getDaily(number) {
  return request('/daily' + (number ? `?n=${encodeURIComponent(number)}` : ''));
}

/** Checks a guess. Resolves to { correct } plus { phrase, answers: { <voice>: url } } when right. */
export async function guessDaily(number, guess) {
  return request('/daily/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, guess }),
  });
}

/** Gives up on a puzzle (out of tries): { phrase, answers: { <voice>: url } }. */
export async function revealDaily(number) {
  return request('/daily/reveal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number }),
  });
}
