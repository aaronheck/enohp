'use strict';
// Synthetic events for checking the dashboard layout (DASH_FAKE=1). Never used for real numbers.
function fakeEvents(days, now = Date.now()) {
  const ev = [];
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const wrongs = ['pea and butter', 'peanut brittle', 'penny butter', 'pick up butter', 'beef butter'];
  for (let d = days - 1; d >= 0; d--) {
    const dayTs = now - d * 86400000;
    const players = Math.round(20 + (days - d) * 3 + rnd() * 15);
    const puzzle = Math.max(1, 30 - d);
    for (let i = 0; i < players; i++) {
      const device = `dev-${(i * 7 + d) % (players + 25)}-fake`;
      const base = { device, session: device, host: 'yelnatsgame.com', puzzle };
      let t = dayTs + i * 60000;
      const push = (name, props = {}) => ev.push({ t: 'evt', name, ts: (t += 4000), ...base, ...props });
      push('page_view', { path: '/' });
      push('daily_view', { forced: false });
      if (rnd() < 0.3) { push('howto_open', { game: 'daily', source: 'auto' }); push('howto_close', { game: 'daily', how: rnd() < 0.5 ? 'done' : 'skip', slide: 1 + Math.floor(rnd() * 4) }); }
      if (rnd() < 0.9) push('daily_listened'); else continue;
      let tries = 0, mimics = 0;
      while (tries < 5) {
        if (rnd() < 0.6 && tries < 4) { mimics++; if (mimics > 1) tries++; push('mimic', { n: mimics }); }
        tries++;
        if (rnd() < 0.45) { push('guess', { correct: true, try: tries }); push('daily_solved', { tries, mimics, mind_reader: tries === 1 && mimics === 0 }); if (rnd() < 0.4) push('share', { result: 'shared', method: 'image' }); break; }
        push('guess', { correct: false, try: tries, text: wrongs[Math.floor(rnd() * wrongs.length)] });
        if (tries >= 5) push('daily_failed', { mimics });
      }
      if (rnd() < 0.1) { push('play_with_friends', { from: 'solved' }); push('chain_started'); }
    }
  }
  return ev;
}
module.exports = { fakeEvents };
