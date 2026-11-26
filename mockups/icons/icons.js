// Icon concepts as SVG strings (viewBox 0 0 100 100, full-bleed square).
const BG = '#0f3a2d', CREAM = '#fff4dc', INK = '#14241d', BUTTER = '#ffd84d', TOMATO = '#ff5b3a', SKY = '#8fd3ff', DEEP = '#0a2a20';
const bars = (x, y, h, n, w, gap, color, grow) => Array.from({ length: n }, (_, i) => {
  const k = grow ? (i + 1) / n : 1 - i / n;
  const bh = Math.max(4, h * (0.25 + 0.75 * k));
  return `<rect x="${x + i * (w + gap)}" y="${y - bh / 2}" width="${w}" height="${bh}" rx="${w / 2}" fill="${color}"/>`;
}).join('');
const ICONS = {
  'Bean': `<rect width="100" height="100" rx="22" fill="${BG}"/>
    <ellipse cx="50" cy="86" rx="24" ry="5" fill="${DEEP}"/>
    <rect x="28" y="20" width="44" height="66" rx="22" fill="${TOMATO}"/>
    <circle cx="42" cy="44" r="4.5" fill="${INK}"/><circle cx="58" cy="44" r="4.5" fill="${INK}"/>
    <ellipse cx="50" cy="60" rx="6" ry="7.5" fill="${INK}"/><circle cx="63" cy="54" r="4" fill="#ffb3c7" opacity=".8"/>`,
  'Gibberish bubble': `<rect width="100" height="100" rx="22" fill="${BG}"/>
    <path d="M30 70 L24 86 L44 72 Z" fill="${BUTTER}"/>
    <rect x="12" y="24" width="76" height="48" rx="24" fill="${BUTTER}"/>
    ${bars(26, 48, 26, 7, 4.5, 3.6, INK, true)}`,
  'Rewind': `<rect width="100" height="100" rx="22" fill="${BG}"/>
    <circle cx="50" cy="50" r="32" fill="${CREAM}"/>
    <path d="M49 34 L28 50 L49 66 Z M71 34 L50 50 L71 66 Z" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" transform="translate(1 0)"/>`,
  'Flip wave': `<rect width="100" height="100" rx="22" fill="${BG}"/>
    ${bars(14, 50, 44, 5, 5, 3, BUTTER, true)}
    <rect x="48.5" y="18" width="3" height="64" rx="1.5" fill="${CREAM}" opacity=".7"/>
    ${bars(57, 50, 44, 5, 5, 3, SKY, false)}`,
  'Bean + bubble': `<rect width="100" height="100" rx="22" fill="${BG}"/>
    <rect x="10" y="38" width="34" height="50" rx="17" fill="${TOMATO}"/>
    <circle cx="22" cy="56" r="3.5" fill="${INK}"/><circle cx="33" cy="56" r="3.5" fill="${INK}"/><ellipse cx="28" cy="69" rx="4" ry="5" fill="${INK}"/>
    <path d="M48 46 L42 58 L58 48 Z" fill="${BUTTER}"/>
    <rect x="44" y="14" width="46" height="36" rx="18" fill="${BUTTER}"/>
    ${bars(54, 32, 18, 5, 3.6, 3, INK, true)}`,
  'Y': `<rect width="100" height="100" rx="22" fill="${BG}"/>
    <text x="50" y="76" text-anchor="middle" font-family="'Bricolage Grotesque'" font-weight="800" font-size="78" fill="${BUTTER}">Y</text>
    <rect x="22" y="82" width="56" height="5" rx="2.5" fill="${TOMATO}"/>`,
};
const svg = (body, size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${body}</svg>`;
if (typeof module !== 'undefined') module.exports = { ICONS, svg };
