/* FORMA domain — measurement trends, symmetry, guided reading (PRD 2.4, 7.3, 12.3).
   Null stays null. A trend needs >=2 usable points before it is claimed. */

function seriesFor(measurements, field) {
  return measurements
    .filter(m => m[field] !== null && m[field] !== undefined)
    .map(m => ({ date: m.date, value: m[field], reliable: m.reliable !== false, isSeed: !!m.isSeed }));
}

function trendSummary(measurements, field, labelHe) {
  const pts = seriesFor(measurements, field);
  const usable = pts.filter(p => p.reliable);
  if (usable.length < 2) {
    return { field, labelHe, points: pts, hasTrend: false, message: `אין מספיק מדידות של ${labelHe} כדי לקבוע מגמה.` };
  }
  const first = usable[0], last = usable[usable.length - 1];
  const delta = Math.round((last.value - first.value) * 10) / 10;
  const spanDays = Math.round((new Date(last.date) - new Date(first.date)) / 86400000);
  const direction = delta === 0 ? 'יציב' : delta > 0 ? 'עלייה' : 'ירידה';
  const reliability = spanDays > 240 ? 'long_range' : usable.length >= 3 ? 'medium' : 'low';
  return {
    field, labelHe, points: pts, hasTrend: true, delta, direction, spanDays, reliability,
    message: `${direction === 'יציב' ? 'ללא שינוי מהותי' : `${direction} של ${Math.abs(delta)} ס"מ`} ב${labelHe} על פני ${spanDays} ימים.`
  };
}

function armSymmetry(measurements, field) {
  const leftField = `left_${field}_cm`, rightField = `right_${field}_cm`;
  const rows = measurements.filter(m => m[leftField] != null && m[rightField] != null);
  if (rows.length < 2) return { hasEnoughData: false };
  const last = rows[rows.length - 1];
  const diff = Math.round((last[leftField] - last[rightField]) * 10) / 10;
  const pct = Math.round((Math.abs(diff) / last[rightField]) * 1000) / 10;
  return {
    hasEnoughData: true, diffCm: diff, pctDiff: pct, date: last.date,
    message: Math.abs(diff) < 0.3
      ? 'הידיים כמעט זהות בהיקף.'
      : `יש פער של כ-${Math.abs(diff)} ס"מ בין הידיים. נמשיך לעקוב אם הוא נשמר במספר מדידות.`
  };
}

function bodyweightMovingAverage(weightLogs) {
  const sorted = weightLogs.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  return sorted.map((row, i) => {
    const window = sorted.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((a, r) => a + r.weightKg, 0) / window.length;
    return { date: row.date, weightKg: row.weightKg, movingAvg: Math.round(avg * 10) / 10 };
  });
}

/** Guided double-reading: two readings -> maybe a third if they disagree by >0.7cm. */
function consolidateReadings(readings) {
  const nums = readings.filter(r => typeof r === 'number');
  if (nums.length === 2) {
    const diff = Math.abs(nums[0] - nums[1]);
    if (diff > 0.7) return { needsThirdReading: true, readings: nums };
  }
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return { needsThirdReading: false, readings: nums, value: Math.round(avg * 10) / 10 };
}

const MEASUREMENT_FIELDS = [
  { key: 'chest_cm', labelHe: 'חזה' },
  { key: 'navel_cm', labelHe: 'טבור' },
  { key: 'left_arm_flexed_cm', labelHe: 'יד שמאל מכווצת' },
  { key: 'left_arm_relaxed_cm', labelHe: 'יד שמאל רפויה' },
  { key: 'right_arm_flexed_cm', labelHe: 'יד ימין מכווצת' }
];
