/* FORMA domain — weekly schedule (which weekday maps to which activity) and
   the 6-week progression block. The user can remap weekdays; the workout
   CONTENT (days A/B/C) never changes from a remap — only which day it falls on. */

const WEEKDAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const ACTIVITY_TYPES = {
  'strength-a': { kind: 'strength', dayId: 'day-a', labelHe: 'אימון A — פלג גוף עליון 1', shortHe: 'אימון A' },
  'strength-b': { kind: 'strength', dayId: 'day-b', labelHe: 'אימון B — רגליים + בטן', shortHe: 'אימון B' },
  'strength-c': { kind: 'strength', dayId: 'day-c', labelHe: 'אימון C — פלג גוף עליון 2', shortHe: 'אימון C' },
  'run-easy': { kind: 'run-easy', labelHe: 'ריצה קלה', shortHe: 'ריצה קלה' },
  'run-quality': { kind: 'run-quality', labelHe: 'ריצת איכות מבוקרת', shortHe: 'ריצת איכות' },
  'recovery': { kind: 'recovery', labelHe: 'התאוששות — הליכה או מוביליטי', shortHe: 'התאוששות' },
  'rest': { kind: 'rest', labelHe: 'מנוחה', shortHe: 'מנוחה' }
};

function getWeeklySchedule() {
  return FORMA_DB.getSettings().weeklySchedule || FORMA_SEED.weeklySchedule;
}

function saveWeeklySchedule(schedule) {
  FORMA_DB.saveSettings({ weeklySchedule: schedule });
}

/** dayIndex: 0=Sunday..6=Saturday (matches Date.getDay()). Defaults to today. */
function scheduleForWeekday(dayIndex) {
  const schedule = getWeeklySchedule();
  const activityKey = schedule[dayIndex];
  return ACTIVITY_TYPES[activityKey] || ACTIVITY_TYPES['rest'];
}

function todaysActivity() {
  return scheduleForWeekday(new Date().getDay());
}

function weekActivityList() {
  return WEEKDAY_NAMES_HE.map((name, i) => ({ dayIndex: i, nameHe: name, activity: scheduleForWeekday(i) }));
}

/** PRD-given 6-week periodization block. Repeats as a new cycle after week 6.
    rpeLabel is the PRD's own wording; rirLabel is the same thing restated as
    RIR (RIR = 10 − RPE) so the UI can speak the same language as the current
    RIR-based program rather than mixing two scales on one screen. */
const PROGRAM_BLOCK_WEEKS = [
  { week: 1, rpeLabel: 'RPE 7–7.5', rirLabel: 'RIR 2.5–3', volumePct: 100, note: 'שבוע כיול' },
  { week: 2, rpeLabel: 'RPE 7.5–8', rirLabel: 'RIR 2–2.5', volumePct: 100, note: 'בניית קצב' },
  { week: 3, rpeLabel: 'RPE 8', rirLabel: 'RIR 2', volumePct: 100, note: 'התקדמות' },
  { week: 4, rpeLabel: 'RPE 8–8.5', rirLabel: 'RIR 1.5–2', volumePct: 100, note: 'העלאת עומס' },
  { week: 5, rpeLabel: 'RPE 8.5–9', rirLabel: 'RIR 1–1.5', volumePct: 100, note: 'שיא מבוקר' },
  { week: 6, rpeLabel: 'RPE 6–7', rirLabel: 'RIR 3–4', volumePct: 55, note: 'Deload — כ-50%–60% מהנפח' }
];

/** How the program itself states the target for one prescription: RIR when the
    program declared it, otherwise the day's own guidance. Never invents a number. */
function intensityLabel(prescription) {
  if (!prescription) return null;
  const { rirLow, rirHigh } = prescription;
  if (rirLow == null || rirHigh == null) return 'שליטה מלאה';
  if (rirLow === rirHigh) return `RIR ${rirLow}`;
  if (rirLow === 0 && rirHigh === 1) return 'קרוב לכשל';
  return `RIR ${rirLow}–${rirHigh}`;
}

function getBlockStartDate() {
  return FORMA_DB.getSettings().programBlockStartDate || FORMA_DB.getSettings().onboardingDate || new Date().toISOString().slice(0, 10);
}

function setBlockStartDate(iso) {
  FORMA_DB.saveSettings({ programBlockStartDate: iso });
}

function currentBlockWeek() {
  const start = new Date(getBlockStartDate() + 'T00:00:00');
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now - start) / 86400000));
  const weekInCycle = Math.floor(diffDays / 7) % 6;
  return PROGRAM_BLOCK_WEEKS[weekInCycle];
}

/** How far through the current 6-week cycle we are, 1–100. */
function currentBlockProgressPct() {
  const start = new Date(getBlockStartDate() + 'T00:00:00');
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now - start) / 86400000));
  const dayInCycle = diffDays % 42;
  return Math.round(((dayInCycle + 1) / 42) * 100);
}
