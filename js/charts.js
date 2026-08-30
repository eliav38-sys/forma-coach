/* FORMA — hand-rolled SVG line chart. No bundler, no chart library.
   True time-scaled x-axis (so a year of silence between two readings reads as
   silence, not as evenly-spaced progress) — matches PRD 2.4's "long-range
   trend, not a precise monthly one" instruction. Null values break the line
   instead of being interpolated; unreliable points render as hollow dashes. */

function fmtShortDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

function renderLineChart({ width = 600, height = 200, seriesList, unit = '', emptyMessage = 'אין עדיין מספיק נתונים לגרף.' }) {
  const pad = { t: 18, r: 10, b: 26, l: 10 };
  const allPts = seriesList.flatMap(s => s.points.filter(p => p.value != null));
  if (allPts.length === 0) return `<div class="chart-empty">${emptyMessage}</div>`;

  const times = allPts.map(p => new Date(p.date).getTime());
  const realMin = Math.min(...times), realMax = Math.max(...times);
  let tMin = realMin, tMax = realMax;
  if (tMin === tMax) { tMin -= 86400000 * 15; tMax += 86400000 * 15; }

  const values = allPts.map(p => p.value);
  let vMin = Math.min(...values), vMax = Math.max(...values);
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const vPad = (vMax - vMin) * 0.15;
  vMin -= vPad; vMax += vPad;

  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = (iso) => pad.l + ((new Date(iso).getTime() - tMin) / (tMax - tMin)) * innerW;
  const y = (v) => pad.t + innerH - ((v - vMin) / (vMax - vMin)) * innerH;

  let svg = '';
  seriesList.forEach((s, si) => {
    const color = `var(${s.colorVar || '--accent'})`;
    let runs = [[]];
    s.points.forEach(p => {
      if (p.value == null) { if (runs[runs.length - 1].length) runs.push([]); return; }
      runs[runs.length - 1].push(p);
    });
    runs = runs.filter(r => r.length);

    runs.forEach(run => {
      if (run.length > 1) {
        const d = run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
        svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="${si === 0 ? 1 : 0.75}"/>`;
      }
    });

    s.points.forEach(p => {
      if (p.value == null) return;
      const cx = x(p.date).toFixed(1), cy = y(p.value).toFixed(1);
      if (p.reliable === false) {
        svg += `<circle cx="${cx}" cy="${cy}" r="4.5" class="pt-unreliable"><title>${fmtShortDate(p.date)}: ${p.value}${unit} (מסומן כלא אמין)</title></circle>`;
      } else {
        svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="1.5"><title>${fmtShortDate(p.date)}: ${p.value}${unit}</title></circle>`;
      }
    });
  });

  const axisY = height - 8;
  if (realMin === realMax) {
    const onlyDate = new Date(realMin).toISOString().slice(0, 10);
    svg += `<text x="${width / 2}" y="${axisY}" font-size="11" fill="var(--ink-400)" font-family="var(--font-num)" text-anchor="middle">${fmtShortDate(onlyDate)} (נקודה אחת בלבד)</text>`;
  } else {
    const firstDate = new Date(realMin).toISOString().slice(0, 10);
    const lastDate = new Date(realMax).toISOString().slice(0, 10);
    svg += `<text x="${pad.l}" y="${axisY}" font-size="11" fill="var(--ink-400)" font-family="var(--font-num)">${fmtShortDate(firstDate)}</text>`;
    svg += `<text x="${width - pad.r}" y="${axisY}" font-size="11" fill="var(--ink-400)" font-family="var(--font-num)" text-anchor="end">${fmtShortDate(lastDate)}</text>`;
  }
  svg += `<text x="${pad.l}" y="${pad.t}" font-size="11" fill="var(--ink-400)" font-family="var(--font-num)">${Math.round(vMax - vPad)}${unit}</text>`;
  svg += `<text x="${pad.l}" y="${height - pad.b}" font-size="11" fill="var(--ink-400)" font-family="var(--font-num)">${Math.round(vMin + vPad)}${unit}</text>`;

  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="גרף מגמה">${svg}</svg></div>`;
}
