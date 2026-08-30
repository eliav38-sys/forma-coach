/* FORMA — Body Atlas. Abstract geometric figure on purpose — "visual and
   precise, not a threatening anatomical illustration". Status colors are
   paired with icon + text, never color alone. Planned-sets-per-zone comes
   from summing the actual per-day prescriptions (accurate at zone
   granularity); the separately-declared weekly muscle targets from the
   program are shown as their own reference on the Progress dashboard. */

const ATLAS_STATUS_META = {
  'not-worked': { labelHe: 'לא עבד השבוע', tone: 'mid', icon: ICONS.dash },
  'as-planned': { labelHe: 'עבד כמתוכנן', tone: 'good', icon: ICONS.check },
  'high-load': { labelHe: 'עומס גבוה מהמתוכנן', tone: 'mid', icon: ICONS.arrowUp },
  'pain': { labelHe: 'כאב או אי-נוחות דווחו', tone: 'low', icon: ICONS.flame },
  'no-data': { labelHe: 'אין תרגילים בתוכנית הנוכחית', tone: 'neutral', icon: ICONS.dash }
};

function getZoneStatus(zoneMuscles) {
  const setLogs = FORMA_DB.getSetLogs();
  const days = FORMA_DB.getWorkoutDays();
  const since = new Date(); since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString().slice(0, 10);

  const zoneExercises = FORMA_EXERCISES.filter(ex => zoneMuscles.includes(ex.primary) || (ex.secondary || []).some(m => zoneMuscles.includes(m)));
  if (!zoneExercises.length) return { status: 'no-data' };

  const zoneIds = zoneExercises.map(e => e.id);
  const plannedSets = zoneIds.reduce((sum, id) => {
    return sum + days.reduce((s, d) => s + (FORMA_DB.getDayExercise(d.id, id)?.sets || 0), 0);
  }, 0);

  const doneLogs = setLogs.filter(s => zoneIds.includes(s.exerciseId) && !s.warmup && s.createdAt >= sinceIso);
  const doneSets = doneLogs.length;
  const painFlag = doneLogs.some(s => s.pain && s.pain !== 'none');

  if (painFlag) return { status: 'pain', doneSets, plannedSets };
  if (plannedSets > 0 && doneSets === 0) return { status: 'not-worked', doneSets, plannedSets };
  if (plannedSets > 0 && doneSets >= plannedSets * 1.3) return { status: 'high-load', doneSets, plannedSets };
  if (doneSets > 0) return { status: 'as-planned', doneSets, plannedSets };
  return { status: plannedSets > 0 ? 'not-worked' : 'no-data', doneSets, plannedSets };
}

const ATLAS_ZONES_FRONT = [
  { key: 'chest', muscles: ['chest'], labelHe: 'חזה', shapes: ['<rect x="118" y="86" width="64" height="46" rx="14"/>'] },
  { key: 'shoulders', muscles: ['front-delts', 'side-delts'], labelHe: 'כתפיים', shapes: ['<circle cx="106" cy="80" r="15"/>', '<circle cx="194" cy="80" r="15"/>'] },
  { key: 'biceps', muscles: ['biceps'], labelHe: 'בייספס', shapes: ['<rect x="86" y="98" width="18" height="46" rx="9"/>', '<rect x="196" y="98" width="18" height="46" rx="9"/>'] },
  { key: 'core', muscles: ['core'], labelHe: 'ליבה', shapes: ['<rect x="126" y="136" width="48" height="52" rx="12"/>'] },
  { key: 'quads', muscles: ['quads'], labelHe: 'קוואדריספס', shapes: ['<rect x="112" y="196" width="30" height="90" rx="14"/>', '<rect x="158" y="196" width="30" height="90" rx="14"/>'] }
];
const ATLAS_ZONES_BACK = [
  { key: 'rear-delts', muscles: ['rear-delts'], labelHe: 'כתף אחורית', shapes: ['<circle cx="106" cy="80" r="15"/>', '<circle cx="194" cy="80" r="15"/>'] },
  { key: 'lats', muscles: ['lats'], labelHe: 'גב רחב', shapes: ['<path d="M118 86 L182 86 L192 150 L150 138 L108 150 Z"/>'] },
  { key: 'mid-back', muscles: ['mid-back'], labelHe: 'גב אמצעי', shapes: ['<rect x="134" y="90" width="32" height="34" rx="8"/>'] },
  { key: 'triceps', muscles: ['triceps'], labelHe: 'טרייספס', shapes: ['<rect x="86" y="98" width="18" height="46" rx="9"/>', '<rect x="196" y="98" width="18" height="46" rx="9"/>'] },
  { key: 'hamstrings-calves', muscles: ['hamstrings', 'calves'], labelHe: 'המסטרינג ותאומים', shapes: ['<rect x="112" y="188" width="30" height="98" rx="14"/>', '<rect x="158" y="188" width="30" height="98" rx="14"/>'] }
];

function toneVar(tone) {
  return { good: '--status-good-ink', mid: '--status-mid-ink', low: '--status-low-ink', neutral: '--ink-400' }[tone] || '--ink-400';
}

function renderAtlasSvg(view) {
  const zones = view === 'back' ? ATLAS_ZONES_BACK : ATLAS_ZONES_FRONT;
  const zoneShapes = zones.map(z => {
    const st = getZoneStatus(z.muscles);
    const meta = ATLAS_STATUS_META[st.status];
    const color = `var(${toneVar(meta.tone)})`;
    const fill = meta.tone === 'neutral' ? 'var(--border-soft)' : `color-mix(in srgb, ${color} 30%, var(--surface))`;
    return `<g class="muscle-zone" tabindex="0" role="button" data-zone="${z.key}" aria-label="${z.labelHe}: ${meta.labelHe}" style="color:${color}">
      ${z.shapes.map(s => s.replace('/>', ` fill="${fill}" stroke="${color}" stroke-width="1.5"/>`)).join('')}
    </g>`;
  }).join('');

  const body = `
    <circle cx="150" cy="46" r="22" fill="var(--bg-sunken)" stroke="var(--border)" stroke-width="1.5"/>
    <path d="M120 66 Q150 58 180 66 L188 150 Q150 170 112 150 Z" fill="var(--bg-sunken)" stroke="var(--border)" stroke-width="1.5"/>
    <rect x="82" y="66" width="20" height="80" rx="10" fill="var(--bg-sunken)" stroke="var(--border)" stroke-width="1.5"/>
    <rect x="198" y="66" width="20" height="80" rx="10" fill="var(--bg-sunken)" stroke="var(--border)" stroke-width="1.5"/>
    <rect x="112" y="150" width="30" height="140" rx="14" fill="var(--bg-sunken)" stroke="var(--border)" stroke-width="1.5"/>
    <rect x="158" y="150" width="30" height="140" rx="14" fill="var(--bg-sunken)" stroke="var(--border)" stroke-width="1.5"/>
  `;
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">${body}${zoneShapes}</svg>`;
}
