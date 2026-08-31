/* FORMA domain — progress feel: level, XP, streak, achievements.

   Everything here is DERIVED from real logged data (completed sessions, cardio,
   measurements, set logs). Nothing is stored separately and nothing is awarded
   for opening the app — an achievement only unlocks off work that was actually
   recorded, so the numbers stay honest. A level is a presentation of real
   training volume, not a currency. */

const XP_PER_STRENGTH_SESSION = 100;
const XP_PER_CARDIO_SESSION = 60;
const XP_PER_MEASUREMENT = 25;
const XP_PER_RECOVERY_CHECK = 10;

/** Level curve: each level costs a little more than the last, so early levels
    arrive quickly and later ones represent real accumulated work. */
function levelFromXp(xp) {
  let level = 1, spent = 0, cost = 300;
  while (xp - spent >= cost) { spent += cost; level++; cost = Math.round(cost * 1.15); }
  return { level, intoLevel: xp - spent, levelSpan: cost, pct: Math.round(((xp - spent) / cost) * 100) };
}

function totalXp() {
  const strength = FORMA_DB.getSessions().filter(s => s.status === 'completed').length;
  const cardio = FORMA_DB.getCardio().length;
  const measures = FORMA_DB.getMeasurements().filter(m => !m.isSeed).length;
  const recovery = FORMA_DB.getRecoveryLogs().length;
  return strength * XP_PER_STRENGTH_SESSION
    + cardio * XP_PER_CARDIO_SESSION
    + measures * XP_PER_MEASUREMENT
    + recovery * XP_PER_RECOVERY_CHECK;
}

function levelState() {
  const xp = totalXp();
  return { xp, ...levelFromXp(xp) };
}

/** yyyy-mm-dd in LOCAL time. Deliberately not toISOString(): a Date built from
    a local midnight renders as the previous day in UTC for any positive offset
    (Israel is UTC+2/+3), which silently shifts every week bucket by a day. */
function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** All dates (yyyy-mm-dd) on which any training was recorded. */
function trainingDates() {
  const dates = new Set();
  FORMA_DB.getSessions().filter(s => s.status === 'completed' && s.endedAt)
    .forEach(s => dates.add(s.endedAt.slice(0, 10)));
  FORMA_DB.getCardio().forEach(c => { const d = c.date || c.createdAt; if (d) dates.add(d.slice(0, 10)); });
  return dates;
}

/** Consecutive WEEKS (not days) with at least one recorded session — running and
    lifting both count. Weeks are the honest unit here: this program trains 3–5
    days a week, so a day streak would break by design every single week. */
function weekStreak() {
  const dates = trainingDates();
  if (!dates.size) return { weeks: 0, activeThisWeek: false };

  /** The Sunday that starts the week containing this yyyy-mm-dd. */
  const weekKey = (d) => {
    const dt = new Date(d + 'T00:00:00');
    dt.setDate(dt.getDate() - dt.getDay());
    return localDateKey(dt);
  };
  const activeWeeks = new Set([...dates].map(weekKey));

  const thisWeek = weekKey(localDateKey(new Date()));
  const activeThisWeek = activeWeeks.has(thisWeek);

  let weeks = 0;
  const cursor = new Date(thisWeek + 'T00:00:00');
  // A week still in progress doesn't break the streak; start counting from the
  // most recent week that actually has work in it.
  if (!activeThisWeek) cursor.setDate(cursor.getDate() - 7);
  while (activeWeeks.has(localDateKey(cursor))) {
    weeks++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return { weeks, activeThisWeek };
}

function sessionsThisMonth() {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const strength = FORMA_DB.getSessions()
    .filter(s => s.status === 'completed' && (s.endedAt || '').startsWith(prefix)).length;
  const cardio = FORMA_DB.getCardio()
    .filter(c => ((c.date || c.createdAt) || '').startsWith(prefix)).length;
  return { strength, cardio, total: strength + cardio };
}

/** Bodyweight change since the first logged weight, or null when there aren't
    two real readings to compare — never a fabricated 0. */
function weightDelta() {
  const logs = FORMA_DB.getBodyweightLogs();
  if (logs.length < 2) return { hasDelta: false, latest: logs[0]?.weightKg ?? null };
  const first = logs[0].weightKg, latest = logs[logs.length - 1].weightKg;
  if (first == null || latest == null) return { hasDelta: false, latest };
  return { hasDelta: true, latest, deltaKg: Math.round((latest - first) * 10) / 10 };
}

/** Progress through the current program block, expressed in sessions. */
function programProgress() {
  const perWeek = Object.values(getWeeklySchedule()).filter(k => ACTIVITY_TYPES[k]?.kind === 'strength').length;
  const target = perWeek * 6; // one full 6-week block
  const start = getBlockStartDate();
  const done = FORMA_DB.getSessions()
    .filter(s => s.status === 'completed' && s.endedAt && s.endedAt.slice(0, 10) >= start).length;
  return { done, target, remaining: Math.max(0, target - done), pct: target ? Math.min(100, Math.round((done / target) * 100)) : 0 };
}

const ACHIEVEMENTS = [
  { id: 'first-session', labelHe: 'האימון הראשון', icon: '🎯', test: s => s.strengthTotal >= 1 },
  { id: 'ten-sessions', labelHe: '10 אימוני כוח', icon: '💪', test: s => s.strengthTotal >= 10 },
  { id: 'fifty-sessions', labelHe: '50 אימוני כוח', icon: '🏆', test: s => s.strengthTotal >= 50 },
  { id: 'first-run', labelHe: 'ריצה ראשונה', icon: '🏃', test: s => s.cardioTotal >= 1 },
  { id: 'full-week', labelHe: 'שבוע מלא — כל האימונים', icon: '📅', test: s => s.fullWeek },
  { id: 'streak-4', labelHe: '4 שבועות ברצף', icon: '🔥', test: s => s.streakWeeks >= 4 },
  { id: 'streak-12', labelHe: '12 שבועות ברצף', icon: '⚡', test: s => s.streakWeeks >= 12 },
  { id: 'measured', labelHe: 'מדידה ראשונה באפליקציה', icon: '📏', test: s => s.measurements >= 1 },
  { id: 'all-three-days', labelHe: 'A, B ו-C — כולם נעשו', icon: '🎖️', test: s => s.distinctDays >= 3 }
];

function achievementState() {
  const sessions = FORMA_DB.getSessions().filter(s => s.status === 'completed');
  const since = new Date(); since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString().slice(0, 10);
  const strengthDaysThisWeek = new Set(sessions.filter(s => s.endedAt >= sinceIso).map(s => s.dayId));
  const plannedStrength = new Set(Object.values(getWeeklySchedule())
    .map(k => ACTIVITY_TYPES[k]).filter(a => a?.kind === 'strength').map(a => a.dayId));

  const stats = {
    strengthTotal: sessions.length,
    cardioTotal: FORMA_DB.getCardio().length,
    measurements: FORMA_DB.getMeasurements().filter(m => !m.isSeed).length,
    streakWeeks: weekStreak().weeks,
    distinctDays: new Set(sessions.map(s => s.dayId)).size,
    fullWeek: plannedStrength.size > 0 && [...plannedStrength].every(d => strengthDaysThisWeek.has(d))
  };
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: !!a.test(stats) }));
}
