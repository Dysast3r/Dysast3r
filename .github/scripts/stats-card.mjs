// Genera la tarjeta de actividad del perfil (dist/stats-dark.svg y dist/stats-light.svg) con datos
// reales de la API GraphQL de GitHub. Con "Include private contributions" activo en el perfil, el
// calendario incluye también las contribuciones privadas (solo como conteo).
//
// Uso en la Action:  GITHUB_TOKEN=... GH_USER=Dysast3r node .github/scripts/stats-card.mjs dist
// Uso local (sin token, para previsualizar el diseño): node stats-card.mjs out --sample
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] ?? 'dist';
const SAMPLE = process.argv.includes('--sample');
const USER = process.env.GH_USER ?? 'Dysast3r';
const TOKEN = process.env.GITHUB_TOKEN;
const TZ = 'America/Santiago';

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

/** Devuelve [{ date: 'YYYY-MM-DD', count }] desde la creación de la cuenta hasta hoy. */
async function fetchDays() {
  const { user } = await graphql('query($login:String!){user(login:$login){createdAt}}', { login: USER });
  const created = new Date(user.createdAt);
  const now = new Date();
  const days = [];

  // contributionsCollection admite como máximo un año por consulta: se pide año por año.
  for (let year = created.getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    const from = new Date(Math.max(Date.UTC(year, 0, 1), created.getTime()));
    const to = new Date(Math.min(Date.UTC(year, 11, 31, 23, 59, 59), now.getTime()));
    const data = await graphql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){
        contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`,
      { login: USER, from: from.toISOString(), to: to.toISOString() }
    );
    for (const week of data.user.contributionsCollection.contributionCalendar.weeks) {
      for (const d of week.contributionDays) days.push({ date: d.date, count: d.contributionCount });
    }
  }

  // Sin duplicados y en orden.
  const byDate = new Map(days.map((d) => [d.date, d.count]));
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}

function sampleDays() {
  const days = [];
  const start = new Date(Date.UTC(2022, 0, 10));
  for (let t = start.getTime(); t <= Date.now(); t += 86400000) {
    const date = new Date(t).toISOString().slice(0, 10);
    const recent = t > Date.now() - 400 * 86400000;
    days.push({ date, count: recent && Math.random() < 0.45 ? Math.ceil(Math.random() * 9) : 0 });
  }
  for (let i = 1; i <= 6; i++) days[days.length - i].count ||= 2;
  return days;
}

function computeStats(days) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const upToToday = days.filter((d) => d.date <= today);

  const total = upToToday.reduce((s, d) => s + d.count, 0);
  const first = upToToday.find((d) => d.count > 0)?.date ?? upToToday[0]?.date;
  const yearAgo = new Date(Date.now() - 365 * 86400000).toLocaleDateString('en-CA', { timeZone: TZ });
  const lastYear = upToToday.filter((d) => d.date > yearAgo).reduce((s, d) => s + d.count, 0);
  const activeDays = upToToday.filter((d) => d.date > yearAgo && d.count > 0).length;

  let longest = { length: 0, start: null, end: null };
  let run = { length: 0, start: null };
  for (const d of upToToday) {
    if (d.count > 0) {
      run = run.length ? { length: run.length + 1, start: run.start } : { length: 1, start: d.date };
      if (run.length > longest.length) longest = { ...run, end: d.date };
    } else {
      run = { length: 0, start: null };
    }
  }

  // La racha actual sigue viva si hoy todavía no hay contribuciones pero ayer sí.
  let i = upToToday.length - 1;
  if (i >= 0 && upToToday[i].count === 0) i--;
  let current = { length: 0, start: null, end: null };
  for (; i >= 0 && upToToday[i].count > 0; i--) {
    current = { length: current.length + 1, start: upToToday[i].date, end: current.end ?? upToToday[i].date };
  }

  // Últimas 26 semanas para las barras de actividad.
  const recent = upToToday.slice(-26 * 7);
  return { total, first, lastYear, activeDays, longest, current, recent, today };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const THEMES = {
  dark: {
    bg: '#0a0a0b', border: '#222226', divider: '#1c1c20', fg: '#f3f3f0', muted: '#9c9ca3', faint: '#6b6b72',
    ring: '#222226', cells: ['#161618', '#3d2405', '#7a4300', '#c26a00', '#ff8800'],
  },
  light: {
    bg: '#ffffff', border: '#e1e1dc', divider: '#ececE8', fg: '#121214', muted: '#5d5d63', faint: '#8a8a90',
    ring: '#efefec', cells: ['#efefec', '#ffe2bf', '#ffc27a', '#ffa033', '#ff8800'],
  },
};

const fmt = (iso, withYear = true) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
        timeZone: 'UTC',
      }).replace('.', '')
    : '—';

const range = (s) =>
  !s.start ? 'Sin racha activa' : s.start === s.end ? fmt(s.start) : `${fmt(s.start, false)} – ${fmt(s.end)}`;

const nf = (n) => n.toLocaleString('es-CL');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function render(stats, name) {
  const t = THEMES[name];
  const W = 900;
  const H = 260;
  const font = `ui-sans-serif,-apple-system,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif`;
  const mono = `ui-monospace,'SF Mono','Cascadia Code',Consolas,monospace`;
  const col = W / 3;

  // Anillo de la racha actual
  const R = 46;
  const C = 2 * Math.PI * R;
  const ringFill = Math.min(stats.current.length / Math.max(stats.longest.length, 7), 1);

  // Actividad semanal de los últimos 6 meses como barras (altura e intensidad según el total).
  const gap = 3;
  const gridW = 640;
  const gx = (W - gridW) / 2;
  const gy = 212;
  const weeks = [];
  for (let w = 0; w < stats.recent.length; w += 7) weeks.push(stats.recent.slice(w, w + 7).reduce((s, d) => s + d.count, 0));
  const wmax = Math.max(1, ...weeks);
  const barW = (gridW - (weeks.length - 1) * gap) / weeks.length;
  const bars = weeks
    .map((v, i) => {
      const h = 4 + (v / wmax) * 22;
      const level = v === 0 ? 0 : Math.min(4, Math.ceil((v / wmax) * 4));
      const x = gx + i * (barW + gap);
      return `<rect class="bar" style="animation-delay:${(0.4 + i * 0.025).toFixed(3)}s" x="${x.toFixed(1)}" y="${(gy + 26 - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${t.cells[Math.max(level, v ? 1 : 0)]}"/>`;
    })
    .join('');

  const stat = (cx, value, label, sub, delay, accent = false) => `
  <g class="rise" style="animation-delay:${delay}s">
    <text x="${cx}" y="98" text-anchor="middle" font-family="${font}" font-size="40" font-weight="700" letter-spacing="-1.2" fill="${t.fg}">${esc(value)}</text>
    <text x="${cx}" y="128" text-anchor="middle" font-family="${font}" font-size="14.5" font-weight="600" fill="${accent ? '#ff8800' : t.fg}">${esc(label)}</text>
    <text x="${cx}" y="150" text-anchor="middle" font-family="${font}" font-size="12.5" fill="${t.muted}">${esc(sub)}</text>
  </g>`;

  const cx = col * 1.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${nf(stats.total)} contribuciones; racha actual de ${stats.current.length} días; racha más larga de ${stats.longest.length} días">
<style>
  .rise{animation:rise .8s cubic-bezier(.2,.8,.2,1) both}
  @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .ring{stroke-dasharray:${C.toFixed(2)};stroke-dashoffset:${C.toFixed(2)};animation:ring 1.6s cubic-bezier(.2,.8,.2,1) .3s forwards}
  @keyframes ring{to{stroke-dashoffset:${(C * (1 - ringFill)).toFixed(2)}}}
  .bar{transform-box:fill-box;transform-origin:bottom;animation:grow .7s cubic-bezier(.2,.8,.2,1) both}
  @keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
  .flame{transform-box:fill-box;transform-origin:center bottom;animation:flicker 1.8s ease-in-out infinite}
  @keyframes flicker{0%,100%{transform:scale(1)}50%{transform:scale(1.12) rotate(-3deg)}}
  @media (prefers-reduced-motion:reduce){.rise,.bar,.flame{animation:none}.ring{animation:none;stroke-dashoffset:${(C * (1 - ringFill)).toFixed(2)}}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="${t.bg}" stroke="${t.border}"/>
<line x1="${col}" y1="34" x2="${col}" y2="168" stroke="${t.divider}"/>
<line x1="${col * 2}" y1="34" x2="${col * 2}" y2="168" stroke="${t.divider}"/>

${stat(col / 2, nf(stats.total), 'Contribuciones totales', `Desde ${fmt(stats.first)}`, 0.05)}

<g class="rise" style="animation-delay:.15s">
  <circle cx="${cx}" cy="76" r="${R}" fill="none" stroke="${t.ring}" stroke-width="6"/>
  <circle class="ring" cx="${cx}" cy="76" r="${R}" fill="none" stroke="#ff8800" stroke-width="6" stroke-linecap="round" transform="rotate(-90 ${cx} 76)"/>
  <g class="flame"><path transform="translate(${cx - 9} ${76 - R - 13})" d="M9 0C10 5 15 7 15 13a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2 1 3.5 2.5 3.5C9.5 7 8 4 9 0Z" fill="#ff8800" stroke="${t.bg}" stroke-width="2.5" paint-order="stroke"/></g>
  <text x="${cx}" y="90" text-anchor="middle" font-family="${font}" font-size="38" font-weight="700" letter-spacing="-1" fill="${t.fg}">${stats.current.length}</text>
  <text x="${cx}" y="150" text-anchor="middle" font-family="${font}" font-size="14.5" font-weight="600" fill="#ff8800">Racha actual</text>
  <text x="${cx}" y="170" text-anchor="middle" font-family="${font}" font-size="12.5" fill="${t.muted}">${esc(range(stats.current))}</text>
</g>

${stat(col * 2.5, `${stats.longest.length} ${stats.longest.length === 1 ? 'día' : 'días'}`, 'Racha más larga', range(stats.longest), 0.25)}

<text x="${gx}" y="${gy - 12}" font-family="${mono}" font-size="10.5" letter-spacing="1.6" fill="${t.faint}">ÚLTIMOS 6 MESES</text>
<text x="${gx + gridW}" y="${gy - 12}" text-anchor="end" font-family="${mono}" font-size="10.5" letter-spacing="1.2" fill="${t.faint}">${nf(stats.lastYear)} EN EL ÚLTIMO AÑO · ${stats.activeDays} DÍAS ACTIVOS</text>
${bars}
</svg>
`;
}

// ---------------------------------------------------------------------------

const days = SAMPLE ? sampleDays() : await fetchDays();
const stats = computeStats(days);
mkdirSync(OUT, { recursive: true });
for (const name of Object.keys(THEMES)) writeFileSync(`${OUT}/stats-${name}.svg`, render(stats, name));
console.log(
  `total=${stats.total} últimoAño=${stats.lastYear} racha=${stats.current.length} másLarga=${stats.longest.length}`
);
