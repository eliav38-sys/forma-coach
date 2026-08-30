/* FORMA domain — recovery score & load adjustment (PRD section 5.7, 5.6).
   Pure functions: given the 20-second check-in, return a score, a *reasoned*
   band, and one adjustment suggestion the user can still reject. Percentages
   are ranges, not blind rules — the dominant factor decides volume vs. load. */

const RECOVERY_SLEEP_BUCKETS = [
  { id: 'lt5', labelHe: 'פחות מ-5 שעות', score: 15 },
  { id: '5-6', labelHe: '5–6 שעות', score: 45 },
  { id: '6-7', labelHe: '6–7 שעות', score: 65 },
  { id: '7-8', labelHe: '7–8 שעות', score: 85 },
  { id: '8plus', labelHe: '8 שעות ומעלה', score: 100 }
];
const SCALE_5 = ['נמוך מאוד', 'נמוך', 'בינוני', 'טוב', 'מצוין'];
const SOREN_5 = ['ללא', 'קלים', 'בינוניים', 'משמעותיים', 'קשים'];
const STRESS_5 = ['ללא', 'קל', 'בינוני', 'גבוה', 'גבוה מאוד'];

function scoreFrom5(v, invert) {
  const s = [0, 25, 50, 75, 100][v] ?? 50;
  return invert ? 100 - s : s;
}

function computeRecoveryScore(input) {
  const sleepBucket = RECOVERY_SLEEP_BUCKETS.find(b => b.id === input.sleepBucket) || RECOVERY_SLEEP_BUCKETS[2];
  const sleepScore = sleepBucket.score;
  const energyScore = scoreFrom5(input.energy, false);
  const sorenessScore = scoreFrom5(input.soreness, true);
  const stressScore = scoreFrom5(input.stress, true);
  const effortMap = { none: 100, moderate: 60, hard: 25 };
  const effortScore = effortMap[input.hardEffort24h] ?? 100;

  const weighted =
    sleepScore * 0.30 +
    energyScore * 0.25 +
    sorenessScore * 0.20 +
    stressScore * 0.15 +
    effortScore * 0.10;

  const score = Math.round(Math.max(0, Math.min(100, weighted)));
  const band = score >= 75 ? 'good' : score >= 50 ? 'moderate' : 'low';

  const reasons = [];
  if (sleepScore < 100) reasons.push(`שינה: ${sleepBucket.labelHe}`);
  if (energyScore < 75) reasons.push(`אנרגיה: ${SCALE_5[input.energy - 1]}`);
  if (sorenessScore < 75) reasons.push(`כאבי שרירים: ${SOREN_5[input.soreness - 1]}`);
  if (stressScore < 75) reasons.push(`סטרס: ${STRESS_5[input.stress - 1]}`);
  if (input.hardEffort24h === 'hard') reasons.push('מאמץ קשה (ריצה/אימון) ב-24 השעות האחרונות');
  if (input.hardEffort24h === 'moderate') reasons.push('מאמץ בינוני ב-24 השעות האחרונות');

  const jointFlag = input.jointPain === 'sharp' ? 'sharp' : input.jointPain === 'mild' ? 'mild' : 'none';

  return {
    score, band, reasons,
    breakdown: { sleepScore, energyScore, sorenessScore, stressScore, effortScore },
    jointFlag,
    dominantFactor: pickDominant({ sleepScore, energyScore, sorenessScore, stressScore, effortScore })
  };
}

function pickDominant(b) {
  const physical = Math.min(b.sorenessScore, b.effortScore);
  const mental = Math.min(b.sleepScore, b.energyScore, b.stressScore);
  return physical <= mental ? 'physical' : 'mental';
}

/** Returns one adjustment suggestion; never auto-applies anything. */
function recommendAdjustment(recovery) {
  if (recovery.jointFlag === 'sharp') {
    return {
      action: 'swap_exercise',
      magnitudePct: null,
      reasons: ['דיווח על כאב מפרקי חד או מחמיר'],
      message: 'דיווחת על כאב מפרקי חד. נעצור המלצות עומס בתרגיל הזה ונציע חלופה בטוחה יותר.',
      safety: { seekProfessionalHelp: true }
    };
  }

  if (recovery.band === 'good') {
    return {
      action: 'keep',
      magnitudePct: 0,
      reasons: recovery.reasons.length ? recovery.reasons : ['התאוששות טובה על פי הבדיקה של הבוקר'],
      message: 'ההתאוששות טובה — ממשיכים עם התוכנית כמתוכנן.'
    };
  }

  if (recovery.band === 'moderate') {
    const magnitudePct = 15;
    const action = recovery.dominantFactor === 'physical' ? 'reduce_load' : 'reduce_volume';
    const verb = action === 'reduce_load' ? `מורידים כ-${magnitudePct}% מהעומס` : `מורידים כ-${magnitudePct}% מהנפח (סט אחד פחות בתרגילים הלא-מרכזיים)`;
    return {
      action, magnitudePct,
      reasons: recovery.reasons,
      message: `ההתאוששות בינונית. שומרים על תרגילי העוגן במשקל הרגיל, ו${verb}.`
    };
  }

  const magnitudePct = 25;
  const action = recovery.dominantFactor === 'physical' ? 'active_recovery' : 'reduce_volume';
  const message = action === 'active_recovery'
    ? 'ההתאוששות חלשה, בעיקר בגלל עומס פיזי. אפשר להחליף היום בהתאוששות פעילה קלה, או לקצר משמעותית את האימון.'
    : `ההתאוששות חלשה. מקצרים את האימון ומורידים כ-${magnitudePct}% מהנפח, ושומרים על משקלים נמוכים יותר בתרגילי העוגן.`;
  return { action, magnitudePct, reasons: recovery.reasons, message };
}

function recoveryStatusMeta(band) {
  if (band === 'good') return { labelHe: 'התאוששות טובה', tone: 'good' };
  if (band === 'moderate') return { labelHe: 'התאוששות בינונית', tone: 'mid' };
  return { labelHe: 'התאוששות חלשה', tone: 'low' };
}
