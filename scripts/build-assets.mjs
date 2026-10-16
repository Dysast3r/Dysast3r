// Genera las piezas visuales del README (banner, stack, proyectos y footer) en tema oscuro y claro,
// en español e inglés. Uso: `node scripts/build-assets.mjs` (necesita internet para bajar los íconos).
//
// Todo va embebido dentro de cada SVG (íconos y capturas como data URI): GitHub sirve las imágenes
// del README a través de su proxy y bloquea cualquier recurso externo dentro de un SVG.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { LANGS, PROFILE, PROJECTS, STACK } from './content.mjs';

const OUT = 'assets';
const SIMPLE_ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons';

const FONT = `ui-sans-serif,-apple-system,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,'SF Mono','Cascadia Code',Consolas,'JetBrains Mono',monospace`;
const ORANGE = '#ff8800';
const EMERALD = '#10b981';

const THEMES = {
  dark: {
    bg: '#0a0a0b', surface: '#111113', grid: 'rgba(243,243,240,0.05)', border: '#222226', divider: '#1c1c20',
    fg: '#f3f3f0', muted: '#9c9ca3', faint: '#6b6b72', chip: '#18181b', tile: '#242938',
    top: '#2a2a30', left: '#1a1a1e', right: '#121215',
    hotTop: '#ff8800', hotLeft: '#b35f00', hotRight: '#7a4100',
    coolTop: '#10b981', coolLeft: '#0b7f59', coolRight: '#07563c',
    glow: 0.55, dotMid: '#3a3a42',
  },
  light: {
    bg: '#f6f6f4', surface: '#ffffff', grid: 'rgba(18,18,20,0.06)', border: '#e1e1dc', divider: '#ecece8',
    fg: '#121214', muted: '#5d5d63', faint: '#8a8a90', chip: '#f1f1ee', tile: '#f4f2ed',
    top: '#ffffff', left: '#e3e3de', right: '#d2d2cc',
    hotTop: '#ffb15c', hotLeft: '#ff8800', hotRight: '#d97000',
    coolTop: '#6ee7b7', coolLeft: '#10b981', coolRight: '#0b8a60',
    glow: 0.35, dotMid: '#c9c9c3',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const dataUri = (mime, buf) => `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
const suffix = (theme, lang) => `${theme}${lang === 'es' ? '' : `-${lang}`}`;

const mix = (a, b, t) => {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

/** Animación de entrada compartida + respeto por "reducir movimiento". */
const BASE_CSS = `
  .rise{animation:rise .9s cubic-bezier(.2,.8,.2,1) both}
  @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`;

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function cubes(t) {
  const N = 9;
  const step = 50;
  const tw = 38;
  const th = 19;
  const ox = 900;
  const oy = 92;
  const hot = { i: 5.5, j: 5.5 };
  const cool = { i: 1, j: 7.5 };
  let out = '';
  for (let s = 0; s <= 2 * (N - 1); s++) {
    for (let i = 0; i < N; i++) {
      const j = s - i;
      if (j < 0 || j >= N) continue;
      const dh = Math.exp(-((i - hot.i) ** 2 + (j - hot.j) ** 2) / 6);
      const dc = Math.exp(-((i - cool.i) ** 2 + (j - cool.j) ** 2) / 3.5);
      const ch = 12 + 46 * dh + 22 * dc + 10 * (0.5 + 0.5 * Math.sin(i * 1.7 + j * 2.3));
      const x = ox + ((i - j) * step) / 2;
      const y = oy + ((i + j) * step) / 4 - ch;
      const top = mix(mix(t.top, t.hotTop, dh), t.coolTop, dc);
      const left = mix(mix(t.left, t.hotLeft, dh), t.coolLeft, dc);
      const right = mix(mix(t.right, t.hotRight, dh), t.coolRight, dc);
      const p = (pts) => pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
      const T = [[x, y], [x + tw / 2, y + th / 2], [x, y + th], [x - tw / 2, y + th / 2]];
      const L = [[x - tw / 2, y + th / 2], [x, y + th], [x, y + th + ch], [x - tw / 2, y + th / 2 + ch]];
      const R = [[x + tw / 2, y + th / 2], [x, y + th], [x, y + th + ch], [x + tw / 2, y + th / 2 + ch]];
      out += `<g class="c" style="animation-delay:${(-(i + j) * 0.18).toFixed(2)}s"><polygon points="${p(L)}" fill="${left}"/><polygon points="${p(R)}" fill="${right}"/><polygon points="${p(T)}" fill="${top}"/></g>`;
    }
  }
  return out;
}

/**
 * Terminal que escribe un comando, lo sostiene y pasa al siguiente. Cada línea tiene su propia
 * ventana dentro de un ciclo común; `textLength` fija el ancho para que el cursor calce con
 * cualquier fuente monoespaciada.
 */
function terminal(commands, t) {
  const CHAR = 10.2;
  const PER = 5; // segundos por comando
  const total = commands.length * PER;
  const w = 100 / commands.length;
  const pct = (v) => `${Math.min(v, 100).toFixed(3)}%`;
  let css = '';
  let out = '';

  commands.forEach((cmd, k) => {
    const width = cmd.length * CHAR;
    const s = k * w;
    const typed = s + w * 0.42;
    const hold = s + w * 0.9;
    const off = hold + 0.01;
    css += `
    .t${k}{transform-box:fill-box;transform-origin:left center;animation:t${k} ${total}s steps(${cmd.length}) infinite}
    @keyframes t${k}{0%,${pct(s)}{transform:scaleX(0)}${pct(typed)},${pct(hold)}{transform:scaleX(1)}${pct(off)},100%{transform:scaleX(0)}}
    .k${k}{animation:k${k} ${total}s steps(${cmd.length}) infinite}
    @keyframes k${k}{0%,${pct(s)}{transform:translateX(0)}${pct(typed)},${pct(hold)}{transform:translateX(${width.toFixed(1)}px)}${pct(off)},100%{transform:translateX(0)}}
    .v${k}{opacity:0;animation:v${k} ${total}s step-end infinite}
    @keyframes v${k}{0%{opacity:0}${pct(s)}{opacity:1}${pct(off)}{opacity:0}}`;
    out += `
    <g class="v${k}">
      <clipPath id="clip${k}"><rect class="t${k}" x="64" y="268" width="${width.toFixed(1)}" height="32"/></clipPath>
      <g clip-path="url(#clip${k})"><text x="64" y="290" font-family="${MONO}" font-size="17" fill="${t.fg}" textLength="${width.toFixed(1)}" lengthAdjust="spacingAndGlyphs"><tspan fill="${EMERALD}">$</tspan>${esc(cmd.slice(1))}</text></g>
      <rect class="k${k}" x="66" y="274" width="9" height="21" rx="1" fill="${ORANGE}"><animate attributeName="opacity" values="1;0;1" dur="0.9s" calcMode="discrete" repeatCount="indefinite"/></rect>
    </g>`;
  });

  const reduced = commands.map((_, k) => `.t${k},.k${k},.v${k}{animation:none}.t${k}{transform:none}.v${k}{opacity:${k === 0 ? 1 : 0}}`).join('');
  const caretEnd = (commands[0].length * CHAR).toFixed(1);
  return { css, out, reduced: `${reduced}.k0{transform:translateX(${caretEnd}px)}` };
}

function header(theme, lang) {
  const t = THEMES[theme];
  const c = PROFILE[lang];
  const W = 1200;
  const H = 380;
  const term = terminal(c.commands, t);
  const badgeW = 46 + c.badge.length * 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(PROFILE.name)} — ${esc(c.roleBefore + c.roleAccent + c.roleAfter)}">
<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${t.grid}"/></pattern>
  <radialGradient id="glowO" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${ORANGE}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowE" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${EMERALD}" stop-opacity="${t.glow * 0.8}"/><stop offset="1" stop-color="${EMERALD}" stop-opacity="0"/></radialGradient>
  <linearGradient id="fade" x1="0" x2="1"><stop offset="0.38" stop-color="${t.bg}"/><stop offset="0.62" stop-color="${t.bg}" stop-opacity="0"/></linearGradient>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  <style>${BASE_CSS}
    .c{animation:float 4.2s ease-in-out infinite}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
    .pulse{animation:pulse 6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes pulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}
    .dot{animation:ping 2.2s ease-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(3);opacity:0}}
    ${term.css}
    @media (prefers-reduced-motion:reduce){.c,.pulse,.dot,.rise{animation:none}${term.reduced}}
  </style>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <ellipse class="pulse" cx="1010" cy="250" rx="260" ry="170" fill="url(#glowO)"/>
  <ellipse class="pulse" cx="760" cy="210" rx="170" ry="120" fill="url(#glowE)" style="animation-delay:-3s"/>
  <g>${cubes(t)}</g>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>

  <g class="rise">
    <rect x="64" y="58" width="${badgeW}" height="30" rx="15" fill="${EMERALD}" fill-opacity="0.1" stroke="${EMERALD}" stroke-opacity="0.3"/>
    <circle class="dot" cx="84" cy="73" r="4" fill="${EMERALD}"/>
    <circle cx="84" cy="73" r="4" fill="${EMERALD}"/>
    <text x="98" y="78" font-family="${MONO}" font-size="12.5" letter-spacing="2.4" fill="${EMERALD}">${esc(c.badge)}</text>
  </g>
  <g class="rise" style="animation-delay:.12s">
    <text x="62" y="160" font-family="${FONT}" font-size="64" font-weight="700" letter-spacing="-2.2" fill="${t.fg}">${esc(PROFILE.name)}</text>
  </g>
  <g class="rise" style="animation-delay:.24s">
    <text x="64" y="208" font-family="${FONT}" font-size="27" font-weight="600" letter-spacing="-0.6" fill="${t.fg}">${esc(c.roleBefore)}<tspan fill="${ORANGE}">${esc(c.roleAccent)}</tspan>${esc(c.roleAfter)}</text>
    <text x="64" y="242" font-family="${FONT}" font-size="17" fill="${t.muted}">${esc(c.lead)}</text>
  </g>
  <g class="rise" style="animation-delay:.36s">${term.out}
  </g>
  <text x="64" y="340" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${t.muted}">${esc(c.meta)}</text>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.border}"/>
</svg>
`;
}

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/** Íconos por tema: los de skillicons ya vienen en recuadro; los de simple-icons se dibujan en uno igual. */
async function loadIcons() {
  const icons = { dark: {}, light: {} };
  for (const group of STACK) {
    for (const item of group.items) {
      for (const theme of ['dark', 'light']) {
        if (item.skill) {
          const svg = await fetchText(`https://skillicons.dev/icons?i=${item.skill}&theme=${theme}`);
          icons[theme][item.name] = dataUri('image/svg+xml', svg);
        } else {
          const glyph = await fetchText(`${SIMPLE_ICONS}/${item.si}.svg`);
          const path = glyph.match(/<path d="([^"]+)"/)[1];
          const tile = THEMES[theme].tile;
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="60" fill="${tile}"/><g transform="translate(56 56) scale(6)"><path d="${path}" fill="${item.tint}"/></g></svg>`;
          icons[theme][item.name] = dataUri('image/svg+xml', svg);
        }
      }
    }
  }
  return icons;
}

function stack(theme, lang, icons) {
  const t = THEMES[theme];
  const W = 1200;
  const TILE = 52;
  const GAP = 22;
  const STEP = TILE + GAP;
  const LABEL_W = 250;
  const ROW_H = 104;
  const TOP = 78;
  const H = TOP + STACK.length * ROW_H + 18;

  let i = 0;
  const rows = STACK.map((group, r) => {
    const y = TOP + r * ROW_H;
    const tiles = group.items
      .map((item, k) => {
        const x = 48 + LABEL_W + k * STEP;
        const delay = (0.1 + i++ * 0.03).toFixed(2);
        return `<g class="rise" style="animation-delay:${delay}s">
      <image href="${icons[theme][item.name]}" x="${x}" y="${y + 14}" width="${TILE}" height="${TILE}"/>
      <text x="${x + TILE / 2}" y="${y + TILE + 32}" text-anchor="middle" font-family="${FONT}" font-size="11.5" fill="${t.muted}">${esc(item.name)}</text>
    </g>`;
      })
      .join('');
    const divider = r < STACK.length - 1 ? `<line x1="48" y1="${y + ROW_H - 4}" x2="${W - 48}" y2="${y + ROW_H - 4}" stroke="${t.divider}"/>` : '';
    return `
  <circle cx="54" cy="${y + 40}" r="4" fill="${group.color}"/>
  <text x="68" y="${y + 45}" font-family="${MONO}" font-size="12.5" letter-spacing="2" fill="${t.fg}">${esc(group.label[lang])}</text>
  <text x="68" y="${y + 64}" font-family="${MONO}" font-size="11" fill="${t.faint}">${group.items.length} ${lang === 'es' ? 'herramientas' : 'tools'}</text>
  ${tiles}
  ${divider}`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(STACK.flatMap((g) => g.items.map((x) => x.name)).join(', '))}">
<style>${BASE_CSS}
  @media (prefers-reduced-motion:reduce){.rise{animation:none}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="${theme === 'dark' ? t.bg : '#ffffff'}" stroke="${t.border}"/>
<text x="48" y="50" font-family="${MONO}" font-size="13" letter-spacing="1" fill="${t.muted}"><tspan fill="${ORANGE}">~/</tspan>stack <tspan fill="${t.faint}">— ${esc(PROFILE[lang].stackTitle)}</tspan></text>
${rows}
</svg>
`;
}

// ---------------------------------------------------------------------------
// Tarjetas de proyecto
// ---------------------------------------------------------------------------

function project(p, theme, lang) {
  const t = THEMES[theme];
  const W = 600;
  const H = 488;
  const IMG = { x: 16, y: 16, w: 568, h: 320 };
  const image = dataUri('image/webp', readFileSync(p.image));
  const bg = theme === 'dark' ? t.bg : '#ffffff';

  // Ajuste de línea simple para el resultado (2 líneas máx.).
  const words = p.outcome[lang].split(' ');
  const lines = [''];
  for (const w of words) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${w}` : w;
    if (next.length > 68 && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = next;
  }

  let cx = 24;
  const chips = p.tech
    .map((name) => {
      const w = 18 + name.length * 7.2;
      const chip = `<rect x="${cx}" y="440" width="${w.toFixed(1)}" height="26" rx="13" fill="${t.chip}" stroke="${t.border}"/><text x="${(cx + w / 2).toFixed(1)}" y="457" text-anchor="middle" font-family="${MONO}" font-size="11.5" fill="${t.muted}">${esc(name)}</text>`;
      cx += w + 8;
      return chip;
    })
    .join('');

  const live = PROFILE[lang].live;
  const liveW = 34 + live.length * 7.4;
  const catW = 24 + p.category[lang].length * 7.6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.name)} — ${esc(p.title[lang])}">
<defs>
  <clipPath id="shot"><rect x="${IMG.x}" y="${IMG.y}" width="${IMG.w}" height="${IMG.h}" rx="12"/></clipPath>
  <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>
  <style>${BASE_CSS}
    .shot{animation:zoom 1.6s cubic-bezier(.2,.8,.2,1) both;transform-origin:50% 0}
    @keyframes zoom{from{transform:scale(1.06)}to{transform:none}}
    .live{animation:ping 2.2s ease-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}
    @media (prefers-reduced-motion:reduce){.rise,.shot,.live{animation:none}}
  </style>
</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${bg}" stroke="${t.border}"/>
<g clip-path="url(#shot)">
  <image class="shot" href="${image}" x="${IMG.x}" y="${IMG.y}" width="${IMG.w}" height="${IMG.h}" preserveAspectRatio="xMidYMin slice"/>
  <rect x="${IMG.x}" y="${IMG.y}" width="${IMG.w}" height="${IMG.h}" fill="url(#shade)"/>
</g>
<rect x="${IMG.x + 0.5}" y="${IMG.y + 0.5}" width="${IMG.w - 1}" height="${IMG.h - 1}" rx="12" fill="none" stroke="${t.border}" stroke-opacity="0.6"/>

<g transform="translate(32 32)">
  <rect width="${catW.toFixed(1)}" height="26" rx="13" fill="#0a0a0b" fill-opacity="0.72" stroke="#ffffff" stroke-opacity="0.14"/>
  <text x="${(catW / 2).toFixed(1)}" y="17.5" text-anchor="middle" font-family="${MONO}" font-size="11.5" letter-spacing="1" fill="#f3f3f0">${esc(p.category[lang].toUpperCase())}</text>
</g>
<g transform="translate(${IMG.x + IMG.w - 16 - liveW} 32)">
  <rect width="${liveW.toFixed(1)}" height="26" rx="13" fill="#0a0a0b" fill-opacity="0.72" stroke="${EMERALD}" stroke-opacity="0.45"/>
  <circle class="live" cx="15" cy="13" r="3.5" fill="${EMERALD}"/>
  <circle cx="15" cy="13" r="3.5" fill="${EMERALD}"/>
  <text x="26" y="17.5" font-family="${MONO}" font-size="11.5" fill="${EMERALD}">${esc(live)}</text>
</g>

<g class="rise" style="animation-delay:.15s">
  <text x="24" y="376" font-family="${FONT}" font-size="24" font-weight="700" letter-spacing="-0.6" fill="${t.fg}">${esc(p.name)}<tspan dx="10" font-size="15" font-weight="500" letter-spacing="0" fill="${t.muted}">${esc(p.title[lang])}</tspan></text>
  <text x="${W - 24}" y="376" text-anchor="end" font-family="${FONT}" font-size="22" fill="${ORANGE}">↗</text>
  ${lines.map((l, k) => `<text x="24" y="${404 + k * 19}" font-family="${FONT}" font-size="13.5" fill="${t.muted}">${esc(l)}</text>`).join('')}
</g>
<g class="rise" style="animation-delay:.3s">${chips}</g>
</svg>
`;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function footer(theme, lang) {
  const t = THEMES[theme];
  const c = PROFILE[lang];
  const W = 1200;
  const H = 330;
  const ROWS = 12;
  const COLS = 46;
  const HORIZON = 206;
  let css = '';
  let dots = '';

  // Grilla de puntos en perspectiva: cada fila más cerca es más ancha, más baja y con puntos más grandes.
  for (let r = 0; r < ROWS; r++) {
    const depth = (r + 1) / ROWS;
    const scale = 0.35 + depth * 0.65;
    const y = HORIZON + depth ** 1.6 * 106;
    const amp = (3 + depth * 9).toFixed(1);
    css += `.r${r}{animation:w${r} 3.6s ease-in-out infinite}@keyframes w${r}{0%,100%{transform:translateY(0)}50%{transform:translateY(-${amp}px)}}`;
    for (let col = 0; col < COLS; col++) {
      const u = col / (COLS - 1) - 0.5;
      const x = W / 2 + u * W * 1.15 * scale;
      if (x < -10 || x > W + 10) continue;
      const delay = (-(col * 0.11 + r * 0.22)).toFixed(2);
      dots += `<circle class="r${r}" style="animation-delay:${delay}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + depth * 2.1).toFixed(2)}" fill="url(#wave)" fill-opacity="${(0.25 + depth * 0.75).toFixed(2)}"/>`;
    }
  }

  const cta = `${c.footerCta} →`;
  const ctaW = 40 + cta.length * 9.6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.footerTitle)} ${esc(c.footerCta)}: ${PROFILE.site}">
<defs>
  <linearGradient id="wave" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
    <stop offset="0.08" stop-color="${ORANGE}"/><stop offset="0.5" stop-color="${t.dotMid}"/><stop offset="0.92" stop-color="${EMERALD}"/>
  </linearGradient>
  <linearGradient id="edges" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.16" stop-color="#fff"/><stop offset="0.84" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="fade"><rect width="${W}" height="${H}" fill="url(#edges)"/></mask>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  <style>${BASE_CSS}
    ${css}
    @media (prefers-reduced-motion:reduce){.rise,[class^="r"]{animation:none}}
  </style>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${theme === 'dark' ? t.bg : '#ffffff'}"/>
  <g mask="url(#fade)">${dots}</g>
  <g class="rise">
    <text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="700" letter-spacing="-1" fill="${t.fg}">${esc(c.footerTitle)}</text>
  </g>
  <g class="rise" style="animation-delay:.15s">
    <rect x="${(W - ctaW) / 2}" y="98" width="${ctaW}" height="42" rx="21" fill="${ORANGE}"/>
    <text x="${W / 2}" y="125" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="700" fill="#121214">${esc(cta)}</text>
  </g>
  <g class="rise" style="animation-delay:.3s">
    <text x="${W / 2}" y="172" text-anchor="middle" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.faint}">${PROFILE.site.toUpperCase()} · ${esc(PROFILE.email.toUpperCase())}</text>
  </g>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.border}"/>
</svg>
`;
}

// ---------------------------------------------------------------------------

mkdirSync(`${OUT}/cards`, { recursive: true });
const icons = await loadIcons();
let count = 0;
for (const lang of LANGS) {
  for (const theme of ['dark', 'light']) {
    const s = suffix(theme, lang);
    writeFileSync(`${OUT}/header-${s}.svg`, header(theme, lang));
    writeFileSync(`${OUT}/stack-${s}.svg`, stack(theme, lang, icons));
    writeFileSync(`${OUT}/footer-${s}.svg`, footer(theme, lang));
    for (const p of PROJECTS) writeFileSync(`${OUT}/cards/${p.slug}-${s}.svg`, project(p, theme, lang));
    count += 3 + PROJECTS.length;
  }
}
console.log(`${count} SVG generados en ${OUT}/`);
