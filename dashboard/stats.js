'use strict';
// Turns raw analytics events (from the Lambda's CloudWatch logs) into dashboard numbers.
// Pure functions so they can be tested without AWS.

const TZ = 'America/Los_Angeles';
const dayOf = (ts) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));

/** Keep real production traffic only. */
function isReal(e) {
  return !e.dev && /^(www\.)?yelnatsgame\.com$/.test(e.host || '');
}

const BROWSER_NAMES = {
  safari: 'Safari', chrome: 'Chrome', firefox: 'Firefox', edge: 'Edge', samsung: 'Samsung Internet', opera: 'Opera',
  instagram: 'Instagram app', facebook: 'Facebook app', tiktok: 'TikTok app', snapchat: 'Snapchat app',
  linkedin: 'LinkedIn app', x: 'X app', google_app: 'Google app',
};
const OS_NAMES = { ios: 'iPhone / iPad', android: 'Android', mac: 'Mac', windows: 'Windows', chromeos: 'ChromeOS', linux: 'Linux' };

const uniq = (list) => new Set(list).size;
const normGuess = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function summarise(events, { days, now = Date.now() }) {
  const real = events.filter(isReal).sort((a, b) => a.ts - b.ts);
  const by = (name) => real.filter((e) => e.name === name);
  const devicesWhere = (name, pred = () => true) => uniq(by(name).filter(pred).map((e) => e.device));

  // ---- daily active players (any event / played the daily) ----
  const dayList = [];
  for (let i = days - 1; i >= 0; i--) dayList.push(dayOf(now - i * 86400000));
  const activeByDay = Object.fromEntries(dayList.map((d) => [d, new Set()]));
  const playersByDay = Object.fromEntries(dayList.map((d) => [d, new Set()]));
  for (const e of real) {
    const d = dayOf(e.ts);
    if (activeByDay[d]) activeByDay[d].add(e.device);
    if (playersByDay[d] && e.name === 'daily_view' && !e.forced) playersByDay[d].add(e.device);
  }
  const daily = dayList.map((d) => ({ day: d, visitors: activeByDay[d].size, players: playersByDay[d].size }));

  // ---- per puzzle ----
  const puzzles = {};
  const P = (n) =>
    (puzzles[n] = puzzles[n] || {
      puzzle: n,
      viewed: new Set(), listened: new Set(), mimicked: new Set(), guessed: new Set(), solved: new Set(), failed: new Set(),
      shared: new Set(), tries: [], mindReaders: 0, wrong: {},
    });
  for (const e of real) {
    const n = Number(e.puzzle);
    if (!Number.isInteger(n) || n < 1) continue;
    if (e.forced) continue; // ?puzzle=N previews aren't real plays
    const p = P(n);
    if (e.name === 'daily_view') p.viewed.add(e.device);
    if (e.name === 'daily_listened') p.listened.add(e.device);
    if (e.name === 'mimic') p.mimicked.add(e.device);
    if (e.name === 'guess') {
      p.guessed.add(e.device);
      if (e.correct === false && e.text) {
        const g = normGuess(e.text);
        p.wrong[g] = (p.wrong[g] || 0) + 1;
      }
    }
    if (e.name === 'daily_solved' && !p.solved.has(e.device)) {
      p.solved.add(e.device);
      if (Number.isFinite(e.tries)) p.tries.push(e.tries);
      if (e.mind_reader) p.mindReaders++;
    }
    if (e.name === 'daily_failed') p.failed.add(e.device);
    if (e.name === 'share' && e.puzzle) p.shared.add(e.device);
  }
  const puzzleRows = Object.values(puzzles)
    .map((p) => {
      const finished = p.solved.size + p.failed.size;
      const dist = [1, 2, 3, 4, 5].map((t) => ({ label: String(t), count: p.tries.filter((x) => x === t).length }));
      dist.push({ label: 'X', count: p.failed.size, failed: true });
      return {
        puzzle: p.puzzle,
        viewed: p.viewed.size,
        listened: p.listened.size,
        mimicked: p.mimicked.size,
        guessed: p.guessed.size,
        solved: p.solved.size,
        failed: p.failed.size,
        solveRate: finished ? p.solved.size / finished : null,
        avgTries: p.tries.length ? p.tries.reduce((a, b) => a + b, 0) / p.tries.length : null,
        mindReaders: p.mindReaders,
        shared: p.shared.size,
        tries: dist,
        wrongGuesses: Object.entries(p.wrong)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([text, count]) => ({ text, count })),
      };
    })
    // Puzzles nobody genuinely opened are ?puzzle=N previews (only the view is flagged).
    .filter((p) => p.viewed > 0)
    .sort((a, b) => b.puzzle - a.puzzle);

  // ---- headline numbers ----
  const players = devicesWhere('daily_view', (e) => !e.forced);
  const allSolves = puzzleRows.reduce((s, p) => s + p.solved, 0);
  const allFinished = puzzleRows.reduce((s, p) => s + p.solved + p.failed, 0);
  const allTries = puzzleRows.flatMap((p) => p.tries.flatMap((t) => (t.failed ? [] : Array(t.count).fill(Number(t.label)))));
  const deviceDays = {};
  for (const e of real) (deviceDays[e.device] = deviceDays[e.device] || new Set()).add(dayOf(e.ts));
  const returning = Object.values(deviceDays).filter((s) => s.size >= 2).length;

  // ---- how-to ----
  const howto = {};
  for (const game of ['daily', 'chain']) {
    const closes = by('howto_close').filter((e) => e.game === game);
    const skipSlides = {};
    for (const e of closes.filter((c) => c.how !== 'done')) skipSlides[e.slide] = (skipSlides[e.slide] || 0) + 1;
    howto[game] = {
      opened: by('howto_open').filter((e) => e.game === game).length,
      autoOpened: by('howto_open').filter((e) => e.game === game && e.source === 'auto').length,
      finished: closes.filter((e) => e.how === 'done').length,
      skipped: closes.filter((e) => e.how === 'skip').length,
      dismissed: closes.filter((e) => e.how === 'dismiss').length,
      leftOnSlide: skipSlides,
    };
  }

  // ---- who's playing: each device's latest page view (browser, OS, time zone) ----
  const latest = {};
  for (const e of by('page_view')) if (e.browser) latest[e.device] = e;
  const countBy = (key, map = (v) => v) => {
    const c = {};
    for (const e of Object.values(latest)) {
      const k = map(e[key]);
      if (k) c[k] = (c[k] || 0) + 1;
    }
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  };
  const top = (list, n) => (list.length > n ? [...list.slice(0, n - 1), { label: 'Other', count: list.slice(n - 1).reduce((s, x) => s + x.count, 0) }] : list);
  const audience = {
    devices: Object.keys(latest).length,
    browsers: top(countBy('browser', (b) => BROWSER_NAMES[b] || b), 8),
    os: top(countBy('os', (o) => OS_NAMES[o] || o), 6),
    // "America/Los_Angeles" -> "Los Angeles (America)"
    timeZones: top(countBy('tz', (z) => (z ? z.split('/').slice(1).join(' / ').replace(/_/g, ' ') + ` (${z.split('/')[0]})` : null)), 10),
    homeScreen: Object.values(latest).filter((e) => e.standalone).length,
  };

  // ---- mic tip (iPhone Safari "always allow the mic" walkthrough) ----
  const micOpens = by('howto_open').filter((e) => e.game === 'mic');
  const micCloses = by('howto_close').filter((e) => e.game === 'mic');
  const micTip = {
    popupShown: micOpens.filter((e) => e.source === 'popup').length,
    cardOpened: micOpens.filter((e) => e.source === 'card').length,
    finished: micCloses.filter((e) => e.how === 'done').length,
    notNow: micCloses.filter((e) => e.source === 'popup' && e.how !== 'done').length,
  };

  // ---- retention: of the devices first seen on a day, how many came back ----
  // A device's first day is its first day in this window; devices already active on
  // the window's first day are left out (they may be older players).
  const dayNo = (d) => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);
  const todayNo = dayNo(dayOf(now));
  const firstDayNo = dayNo(dayList[0]);
  const daysByDevice = {};
  for (const e of real) (daysByDevice[e.device] = daysByDevice[e.device] || new Set()).add(dayNo(dayOf(e.ts)));
  const cohorts = {};
  for (const set of Object.values(daysByDevice)) {
    const first = Math.min(...set);
    if (first === firstDayNo && days > 1) continue;
    const c = (cohorts[first] = cohorts[first] || { size: 0, d1: 0, d7: 0 });
    c.size++;
    if (set.has(first + 1)) c.d1++;
    for (let k = 1; k <= 7; k++) if (set.has(first + k)) { c.d7++; break; }
  }
  const sum = (pred, key) => Object.entries(cohorts).filter(([d]) => pred(Number(d))).reduce((s, [, c]) => s + c[key], 0);
  const d1Eligible = (d) => d + 1 <= todayNo - 1; // the next day is over
  const d7Eligible = (d) => d + 7 <= todayNo - 1;
  const retention = {
    newPlayers: sum(() => true, 'size'),
    d1: { eligible: sum(d1Eligible, 'size'), back: sum(d1Eligible, 'd1') },
    d7: { eligible: sum(d7Eligible, 'size'), back: sum(d7Eligible, 'd7') },
    byDay: Object.entries(cohorts)
      .map(([d, c]) => ({
        day: new Date(Number(d) * 86400000).toISOString().slice(0, 10),
        size: c.size,
        d1: d1Eligible(Number(d)) ? c.d1 / c.size : null,
        d7: d7Eligible(Number(d)) ? c.d7 / c.size : null,
      }))
      .sort((a, b) => (a.day < b.day ? 1 : -1)),
  };

  // ---- errors from players' phones ----
  const errorEvents = by('client_error');
  const groups = {};
  for (const e of errorEvents) {
    const key = [e.kind, e.what || e.err || '', e.msg || ''].join('|');
    const g = (groups[key] = groups[key] || { kind: e.kind, detail: [e.what, e.err, e.status].filter(Boolean).join(' · '), msg: e.msg || '', count: 0, devices: new Set(), last: 0 });
    g.count++;
    g.devices.add(e.device);
    g.last = Math.max(g.last, e.ts);
  }
  const errors = {
    total: errorEvents.length,
    devices: uniq(errorEvents.map((e) => e.device)),
    top: Object.values(groups)
      .sort((a, b) => b.devices.size - a.devices.size || b.count - a.count)
      .slice(0, 15)
      .map((g) => ({ kind: g.kind, detail: g.detail, msg: g.msg, count: g.count, devices: g.devices.size, last: g.last })),
  };

  const shareResults = {};
  for (const e of by('share')) shareResults[e.result || 'unknown'] = (shareResults[e.result || 'unknown'] || 0) + 1;

  return {
    generatedAt: now,
    days,
    totals: {
      visitors: uniq(real.map((e) => e.device)),
      players,
      solves: allSolves,
      solveRate: allFinished ? allSolves / allFinished : null,
      avgTries: allTries.length ? allTries.reduce((a, b) => a + b, 0) / allTries.length : null,
      mindReaders: puzzleRows.reduce((s, p) => s + p.mindReaders, 0),
      shares: by('share').length,
      returning,
      events: real.length,
    },
    daily,
    puzzles: puzzleRows,
    howto,
    audience,
    micTip,
    retention,
    errors,
    shareResults,
    chain: {
      started: by('chain_started').length,
      turnsOpened: by('turn_opened').length,
      newPlayersOnTurns: by('turn_opened').filter((e) => e.new_player && !e.starter).length,
      turnsSent: by('turn_sent').length,
      playWithFriends: by('play_with_friends').length,
    },
  };
}

module.exports = { summarise, isReal, dayOf };
