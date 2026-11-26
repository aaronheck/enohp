// "Tired of the mic popup?" — on their 3rd day, iPhone Safari players get a walkthrough
// for setting this site's microphone permission to Allow. It pops up when they tap
// Mimic it (right before Safari would ask again). If they say "Not now", the results
// screen reminds them once that day, then never again.
const KEY = 'yelnats.micTip';
const DAILY_KEY = 'yelnats.daily';
export const MIC_TIP_DAY = 3; // day 2 they're still getting hooked: don't add friction

/** Safari on iPhone/iPad (not Chrome/Firefox/etc. for iOS, which have their own settings). */
export function isIOSSafari(ua = navigator.userAgent, touch = navigator.maxTouchPoints) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1); // iPadOS says "Macintosh"
  return ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
}

/** Earlier days (puzzles other than today's) this device played, and whether it mimicked on them. */
export function playHistory(today) {
  try {
    const d = JSON.parse(localStorage.getItem(DAILY_KEY));
    const before = Object.entries((d && d.puzzles) || {})
      .filter(([n]) => Number(n) !== Number(today))
      .map(([, p]) => p);
    const played = before.filter((p) => p.solved || p.failed || p.mimics > 0 || (p.guesses && p.guesses.length));
    return { daysBefore: played.length, mimicked: before.some((p) => p.mimics > 0) };
  } catch (e) {
    return { daysBefore: 0, mimicked: false };
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch (e) {
    return { how: 'unknown' }; // storage broken: don't nag
  }
}

/** how: 'done' | 'later' | 'card_x' | 'already' | ... ; puzzle = the day it happened. */
export function markMicTip(how, puzzle) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ how, puzzle, at: Date.now() }));
  } catch (e) {
    // private mode: they may see it again, that's fine
  }
}

const forced = () => /[?&]mictip=1\b/.test(window.location.search); // preview it on any device

/** Pop up the walkthrough when they tap Mimic it? (3rd day or later, used the mic before.) */
export function shouldPopMicTip(today) {
  if (forced()) return !load();
  if (load() || !isIOSSafari()) return false;
  const { daysBefore, mimicked } = playHistory(today);
  return daysBefore >= MIC_TIP_DAY - 1 && mimicked;
}

/** Remind on the results screen? Only the same day they tapped "Not now". */
export function shouldShowMicCard(today) {
  const s = load();
  return !!s && s.how === 'later' && Number(s.puzzle) === Number(today);
}
