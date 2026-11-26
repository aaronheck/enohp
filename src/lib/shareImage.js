// Draws the daily result as a 1080x1350 PNG for sharing (iMessage/WhatsApp show
// images far better than text). Mirrors the on-screen result card.
const C = {
  bg: '#0f3a2d',
  deep: '#0a2a20',
  cream: '#fff4dc',
  ink: '#14241d',
  muted: 'rgba(20,36,29,0.55)',
  butter: '#ffd84d',
  tomato: '#ff5b3a',
  sky: '#8fd3ff',
};
const FONT = "'Bricolage Grotesque', system-ui, sans-serif";

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * result: { number, score: '2/5', failed, mindReader, used, max, actions: ['mimic','miss','hit'], streak }
 * Resolves to a PNG Blob, or null if the browser can't draw it.
 */
export async function drawShareImage(result) {
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.all([document.fonts.load(`800 100px ${FONT}`), document.fonts.load(`700 40px ${FONT}`)]);
    }
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');

    g.fillStyle = C.bg;
    g.fillRect(0, 0, W, H);

    // Header
    g.fillStyle = C.cream;
    g.font = `800 64px ${FONT}`;
    g.textBaseline = 'alphabetic';
    g.fillText('Yelnats', 90, 150);
    g.fillStyle = C.butter;
    g.fillText('Daily', 90 + g.measureText('Yelnats ').width, 150);
    // The day, front and centre: it's a daily game.
    g.fillStyle = result.date ? C.cream : 'rgba(255,244,220,0.66)';
    g.font = result.date ? `800 46px ${FONT}` : `700 38px ${FONT}`;
    g.fillText(result.date || 'The reverse reverse game.', 90, 214);

    // Card (slightly tilted, like a sticker)
    g.save();
    g.translate(W / 2, 700);
    g.rotate((-1.5 * Math.PI) / 180);
    g.fillStyle = C.deep;
    roundRect(g, -450, -370 + 14, 900, 740, 56);
    g.fill();
    g.fillStyle = C.cream;
    roundRect(g, -450, -370, 900, 740, 56);
    g.fill();

    g.fillStyle = C.muted;
    g.font = `800 44px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(`Puzzle #${result.number}`, 0, -270);

    g.fillStyle = result.failed ? C.tomato : C.ink;
    g.font = `800 260px ${FONT}`;
    g.fillText(result.score, 0, -40);

    // Tries dots
    const r = 30;
    const gap = 26;
    const total = result.max * (2 * r) + (result.max - 1) * gap;
    for (let i = 0; i < result.max; i++) {
      const x = -total / 2 + r + i * (2 * r + gap);
      g.beginPath();
      g.arc(x, 60, r, 0, Math.PI * 2);
      if (i < Math.min(result.used, result.max)) {
        g.fillStyle = result.failed ? C.tomato : C.butter;
        g.fill();
      } else {
        g.lineWidth = 7;
        g.strokeStyle = 'rgba(20,36,29,0.25)';
        g.stroke();
      }
    }

    // Moves
    const icons = { mimic: '🎙', miss: '❌', hit: '✅' };
    g.font = `64px ${FONT}`;
    g.fillStyle = C.ink;
    const trail = result.actions.map((a) => icons[a] || '').join('  ') || (result.failed ? '❌' : '✅');
    g.fillText(trail, 0, 205);

    if (result.mindReader) {
      g.font = `800 50px ${FONT}`;
      const label = '🤯 Mind reader';
      const w = g.measureText(label).width + 70;
      g.fillStyle = C.butter;
      roundRect(g, -w / 2, 248, w, 84, 42);
      g.fill();
      g.fillStyle = C.ink;
      g.fillText(label, 0, 307);
    } else if (result.streak >= 2) {
      g.font = `800 50px ${FONT}`;
      g.fillStyle = C.ink;
      g.fillText(`🔥 ${result.streak}-day streak`, 0, 305);
    }
    g.restore();

    // Footer
    g.textAlign = 'center';
    g.fillStyle = C.cream;
    g.font = `800 52px ${FONT}`;
    g.fillText('Can you beat it?', W / 2, 1180);
    g.fillStyle = C.butter;
    g.font = `800 46px ${FONT}`;
    g.fillText('yelnatsgame.com', W / 2, 1250);

    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch (e) {
    return null;
  }
}
