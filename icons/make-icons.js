// Renders the game icon from the game's own drawing code, at several sizes.
// Usage (from the repo root): node icons/make-icons.js   -> rewrites the PNGs in icons/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  const out = await p.evaluate(() => {
    const { ctx, drawBear, drawLemmingAt } = window.__game.art;
    const S = 512;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.clip();
    // honey-sun background with soft rays
    const g = ctx.createRadialGradient(256, 230, 40, 256, 256, 380);
    g.addColorStop(0, '#ffe58a'); g.addColorStop(0.55, '#ffc23d'); g.addColorStop(1, '#f39a1e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(256, 250);
      ctx.arc(256, 250, 420, a, a + Math.PI / 12); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // grassy hill at the bottom
    ctx.fillStyle = '#6cc25f'; ctx.beginPath(); ctx.ellipse(256, 560, 360, 120, 0, 0, Math.PI * 2); ctx.fill();
    // Grizzly, big and close up
    drawBear(250, 640, 2.75, { happy: false });
    // a cheeky lemming peeking in from the bottom right
    drawLemmingAt(432, 500, 3.0, { dir: -1, face: 'cheeky', color: '#e8a35c', seed: 1 });
    ctx.restore();
    const src = document.getElementById('game');
    const sizes = { 'icon-512.png': 512, 'icon-192.png': 192, 'apple-touch-icon.png': 180, 'favicon-32.png': 32 };
    const res = {};
    for (const [name, n] of Object.entries(sizes)) {
      const c = document.createElement('canvas'); c.width = n; c.height = n;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, S, S, 0, 0, n, n);
      res[name] = c.toDataURL('image/png').split(',')[1];
    }
    return res;
  });
  for (const [name, data] of Object.entries(out)) fs.writeFileSync(path.join(__dirname, name), Buffer.from(data, 'base64'));
  console.log(Object.keys(out).map(n => n + ' ' + fs.statSync(path.join(__dirname, n)).size).join('\n'));
  await b.close();
})();
