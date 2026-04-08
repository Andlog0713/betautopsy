// Renders a static preview of the proposed translucent card style to a PNG
// using satori (the same renderer @vercel/og uses) + sharp.
// Run: node render-preview.mjs   →   /tmp/preview-render.png

import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const root = path.resolve('.');
const fontDir = path.join(root, 'public', 'fonts');

const monoRegular = fs.readFileSync(path.join(fontDir, 'IBMPlexMono-Regular.ttf'));
const monoMedium  = fs.readFileSync(path.join(fontDir, 'IBMPlexMono-Medium.ttf'));
const monoBold    = fs.readFileSync(path.join(fontDir, 'IBMPlexMono-Bold.ttf'));

// Tiny JSX-style helper so we can write trees without React.
const h = (type, props = {}, ...children) => {
  const flat = children.flat(Infinity).filter((c) => c !== false && c != null);
  return {
    type,
    props: { ...props, children: flat.length === 1 ? flat[0] : flat },
  };
};

// ── design tokens ──
const C = {
  midnight: '#0D1117',
  fgBright: '#F0F2F5',
  fg: '#D0D5DD',
  fgMuted: '#848D9A',
  fgDim: '#515968',
  scalpel: '#00C9A7',
  win: '#3FB950',
  loss: '#F85149',
  caution: '#D29922',
  cardBg: 'rgba(255, 255, 255, 0.04)',
  cardBgHover: 'rgba(255, 255, 255, 0.06)',
};

// Reusable card style (THE proposed look)
const card = (extra = {}) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: C.cardBg,
  borderRadius: 16,
  padding: 24,
  ...extra,
});

const caseHeader = (color = C.fgDim) => ({
  fontFamily: 'Mono',
  fontSize: 10,
  letterSpacing: 3,
  color,
  textTransform: 'uppercase',
});

const number = (size, color = C.fgBright) => ({
  fontFamily: 'Mono',
  fontWeight: 500,
  fontSize: size,
  color,
  letterSpacing: -0.5,
  lineHeight: 1,
});

const body = (color = C.fgMuted) => ({
  fontFamily: 'Mono',
  fontSize: 13,
  color,
  lineHeight: 1.55,
});

// Linear gauge helper
const gauge = (percent, fillColor) =>
  h('div', { style: { display: 'flex', height: 6, width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 1 } },
    h('div', { style: { display: 'flex', height: 6, width: `${percent}%`, backgroundColor: fillColor, borderRadius: 1 } })
  );

// ── tree ──
const tree = h('div',
  { style: { display: 'flex', flexDirection: 'column', width: 1200, padding: '48px 56px 64px', backgroundColor: C.midnight, fontFamily: 'Mono' } },

  // Header
  h('div', { style: { ...caseHeader(C.scalpel), marginBottom: 8 } }, 'PREVIEW // CARD STYLE PROPOSAL'),
  h('div', { style: { fontFamily: 'Mono', fontSize: 32, fontWeight: 700, color: C.fgBright, letterSpacing: -0.5, marginBottom: 6 } }, 'The new box style.'),
  h('div', { style: { ...body(C.fgMuted), marginBottom: 36, maxWidth: 720 } }, 'Translucent fill at 4% white. 16px radius. No border. One unified style across the site.'),

  // ── Side-by-side: old vs new ──
  h('div', { style: { ...caseHeader(), marginBottom: 14 } }, 'A // SIDE-BY-SIDE'),
  h('div', { style: { display: 'flex', gap: 20, marginBottom: 40 } },
    // OLD
    h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
      h('div', { style: { ...caseHeader(), marginBottom: 10 } }, 'CURRENT // SHARP 2PX'),
      h('div', { style: { display: 'flex', flexDirection: 'column', backgroundColor: '#111318', borderRadius: 2, padding: 24 } },
        h('div', { style: { fontFamily: 'Mono', fontWeight: 700, fontSize: 14, color: C.fgBright, marginBottom: 8 } }, 'Recommendation'),
        h('div', { style: body() }, 'Never bet more than $75 after a loss. Your post-loss stakes average 2.4x your normal size.')
      )
    ),
    // NEW
    h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
      h('div', { style: { ...caseHeader(C.scalpel), marginBottom: 10 } }, 'NEW // TRANSLUCENT 16PX'),
      h('div', { style: card() },
        h('div', { style: { fontFamily: 'Mono', fontWeight: 700, fontSize: 14, color: C.fgBright, marginBottom: 8 } }, 'Recommendation'),
        h('div', { style: body() }, 'Never bet more than $75 after a loss. Your post-loss stakes average 2.4x your normal size.')
      )
    ),
  ),

  // ── Discipline Score readout ──
  h('div', { style: { display: 'flex', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 28, marginBottom: 14 } }),
  h('div', { style: { ...caseHeader(), marginBottom: 14 } }, 'B // DISCIPLINE SCORE READOUT'),
  h('div', { style: card({ marginBottom: 36 }) },
    // Top meta row
    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 18 } },
      h('div', { style: caseHeader(C.scalpel) }, 'DISCIPLINE SCORE'),
      h('div', { style: caseHeader() }, '91 REPORTS')
    ),
    // Number row
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 } },
      h('div', { style: number(56) }, '60'),
      h('div', { style: number(13, C.fgDim) }, '/100'),
      h('div', { style: { fontFamily: 'Mono', fontSize: 11, color: C.caution, letterSpacing: 2, textTransform: 'uppercase', marginLeft: 4 } }, 'DEVELOPING'),
      h('div', { style: { display: 'flex', marginLeft: 'auto', fontFamily: 'Mono', fontSize: 14, color: C.scalpel } }, '↑ +7 pts')
    ),
    // Gauge
    gauge(60, C.caution),
    // Scale
    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 6, ...caseHeader() } },
      h('div', {}, '0'),
      h('div', {}, '25'),
      h('div', {}, '50'),
      h('div', {}, '75'),
      h('div', {}, '100')
    )
  ),

  // ── Two-column bias findings with left-rule accents ──
  h('div', { style: { ...caseHeader(), marginBottom: 14 } }, 'C // BIAS FINDINGS (LEFT-RULE ACCENTS SURVIVE)'),
  h('div', { style: { display: 'flex', gap: 20, marginBottom: 36 } },
    h('div', { style: { ...card({ flex: 1 }), borderLeft: `2px solid ${C.scalpel}` } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
        h('div', { style: { display: 'flex', fontFamily: 'Mono', fontWeight: 700, fontSize: 9, color: '#0a0a12', backgroundColor: C.loss, padding: '3px 6px', borderRadius: 1, letterSpacing: 1 } }, 'HIGH'),
        h('div', { style: caseHeader() }, 'RX-01 // LOSS CHASING')
      ),
      h('div', { style: { ...body(C.fg), marginBottom: 8 } }, 'Your stakes jump 1.8x after every loss. Over 47 sessions this cost you −$340.'),
      h('div', { style: { ...body(C.fgDim), fontSize: 11 } }, 'Detected with high confidence based on 612 settled bets.')
    ),
    h('div', { style: { ...card({ flex: 1 }), borderLeft: `2px solid ${C.loss}` } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
        h('div', { style: { display: 'flex', fontFamily: 'Mono', fontWeight: 700, fontSize: 9, color: '#0a0a12', backgroundColor: C.loss, padding: '3px 6px', borderRadius: 1, letterSpacing: 1 } }, 'HIGH'),
        h('div', { style: caseHeader() }, 'RX-02 // PARLAY ADDICTION')
      ),
      h('div', { style: { ...body(C.fg), marginBottom: 8 } }, '4+ leg parlays are 2-for-31. Cap parlays at 15% of weekly volume.'),
      h('div', { style: { ...body(C.fgDim), fontSize: 11 } }, 'You are currently at 41%.')
    )
  ),

  // ── Profitable / Unprofitable strip ──
  h('div', { style: { ...caseHeader(), marginBottom: 14 } }, 'D // PROFITABLE / UNPROFITABLE STRIP'),
  h('div', { style: { display: 'flex', gap: 20 } },
    // Profitable
    h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
      h('div', { style: { ...caseHeader(C.scalpel), marginBottom: 12 } }, 'PROFITABLE AREAS'),
      h('div', { style: card({ marginBottom: 12 }) },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 } },
          h('div', { style: { fontFamily: 'Mono', fontSize: 14, color: C.fgBright } }, 'NCAAB Parlay'),
          h('div', { style: { ...caseHeader(), color: C.caution } }, 'MEDIUM CONF.')
        ),
        h('div', { style: number(26, C.win) }, '+36.8% ROI'),
        h('div', { style: { ...caseHeader(), marginTop: 8 } }, '13 BETS')
      ),
      h('div', { style: card() },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 } },
          h('div', { style: { fontFamily: 'Mono', fontSize: 14, color: C.fgBright } }, 'NFL'),
          h('div', { style: { ...caseHeader(), color: C.scalpel } }, 'HIGH CONF.')
        ),
        h('div', { style: number(26, C.win) }, '+11.8% ROI'),
        h('div', { style: { ...caseHeader(), marginTop: 8 } }, '46 BETS')
      )
    ),
    // Unprofitable
    h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
      h('div', { style: { ...caseHeader(C.loss), marginBottom: 12 } }, 'UNPROFITABLE AREAS'),
      h('div', { style: card({ marginBottom: 12 }) },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 } },
          h('div', { style: { fontFamily: 'Mono', fontSize: 14, color: C.fgBright } }, 'NBA'),
          h('div', { style: { fontFamily: 'Mono', fontSize: 11, color: C.loss } }, '−$796')
        ),
        h('div', { style: number(26, C.loss) }, '−24.8% ROI'),
        h('div', { style: { ...caseHeader(), marginTop: 8 } }, '62 BETS')
      ),
      h('div', { style: card() },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 } },
          h('div', { style: { fontFamily: 'Mono', fontSize: 14, color: C.fgBright } }, 'Slight Favorite (−110 to −199)'),
          h('div', { style: { fontFamily: 'Mono', fontSize: 11, color: C.loss } }, '−$1,043')
        ),
        h('div', { style: number(26, C.loss) }, '−31.7% ROI'),
        h('div', { style: { ...caseHeader(), marginTop: 8 } }, '57 BETS')
      )
    )
  ),
);

const svg = await satori(tree, {
  width: 1200,
  fonts: [
    { name: 'Mono', data: monoRegular, weight: 400, style: 'normal' },
    { name: 'Mono', data: monoMedium,  weight: 500, style: 'normal' },
    { name: 'Mono', data: monoBold,    weight: 700, style: 'normal' },
  ],
});

const png = await sharp(Buffer.from(svg)).png().toBuffer();
const out = '/tmp/preview-render.png';
fs.writeFileSync(out, png);
console.log('wrote', out, '(', png.length, 'bytes )');
