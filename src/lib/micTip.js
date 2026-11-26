// "Tired of the mic popup?" — after a few days of play, iPhone Safari players get a
// walkthrough for setting this site's microphone permission to Allow.
const KEY = 'yelnats.micTip';
const DAILY_KEY = 'yelnats.daily';
export const MIC_TIP_AFTER_DAYS = 3;

/** Safari on iPhone/iPad (not Chrome/Firefox/etc. for iOS, which have their own settings). */
export function isIOSSafari(ua = navigator.userAgent, touch = navigator.maxTouchPoints) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1); // iPadOS says "Macintosh"
  return ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
}

/** Days (puzzles) this device has played, and whether it has ever mimicked. */
export function playHistory() {
  try {
    const d = JSON.parse(localStorage.getItem(DAILY_KEY));
    const puzzles = Object.values((d && d.puzzles) || {});
    const played = puzzles.filter((p) => p.solved || p.failed || p.mimics > 0 || (p.guesses && p.guesses.length));
    return { days: played.length, mimicked: puzzles.some((p) => p.mimics > 0) };
  } catch (e) {
    return { days: 0, mimicked: false };
  }
}

export function micTipSeen() {
  try {
    return !!localStorage.getItem(KEY);
  } catch (e) {
    return true;
  }
}

export function markMicTipSeen(how) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ how, at: Date.now() }));
  } catch (e) {
    // private mode: they may see it again, that's fine
  }
}

/** Should the results screen offer the walkthrough? */
export function shouldOfferMicTip() {
  if (/[?&]mictip=1\b/.test(window.location.search)) return true; // preview it on any device
  if (micTipSeen() || !isIOSSafari()) return false;
  const { days, mimicked } = playHistory();
  return days >= MIC_TIP_AFTER_DAYS && mimicked;
}
// (We can't tell "Allow" from a one-off grant: Safari reports "granted" for the rest of the
// visit after you tap Allow on the popup, so the card has its own "Already did this" way out.)
